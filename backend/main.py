from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, crud
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Healthcare Triage Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Healthcare Platform API is running"}

@app.post("/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    return crud.create_patient(db=db, patient=patient)

@app.post("/patients/login")
def login_patient(req: schemas.PatientLogin, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.email == req.email).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"id": patient.id, "name": patient.name}

@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, req: schemas.PatientUpdate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient.name = req.name
    patient.age = req.age
    patient.gender = req.gender
    patient.email = req.email
    patient.emergency_contact_name = req.emergency_contact_name
    patient.emergency_contact_phone = req.emergency_contact_phone
    
    history = db.query(models.MedicalHistory).filter(models.MedicalHistory.patient_id == patient_id).first()
    if history:
        history.chronic_conditions = req.chronic_conditions
        history.medications = req.medications
        history.allergies = req.allergies
        
        # Sync the updated history to the AI's RAG memory
        history_text = f"Conditions: {history.chronic_conditions}. Meds: {history.medications}. Allergies: {history.allergies}"
        rag.add_patient_history(patient_id, history_text)
    
    db.commit()
    return {"status": "success"}

@app.get("/doctors/", response_model=list[schemas.Doctor])
def read_doctors(db: Session = Depends(get_db)):
    return crud.get_doctors(db)

@app.post("/appointments/", response_model=schemas.Appointment)
def create_appointment(appointment: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    return crud.create_appointment(db=db, appointment=appointment)

from pydantic import BaseModel
import rag
import agent

from typing import List, Dict

class ChatRequest(BaseModel):
    patient_id: int
    message: str
    history: List[Dict[str, str]] = []

@app.post("/sync-rag/{patient_id}")
def sync_patient_rag(patient_id: int, db: Session = Depends(get_db)):
    """Fetches patient history from SQL and embeds it into ChromaDB"""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient or not patient.medical_history:
        raise HTTPException(status_code=404, detail="Medical history not found")
    
    history_text = f"Conditions: {patient.medical_history.chronic_conditions}. Meds: {patient.medical_history.medications}. Allergies: {patient.medical_history.allergies}"
    rag.add_patient_history(patient_id, history_text)
    return {"status": "synced to vector store"}

@app.post("/chat")
def chat_with_bot(req: ChatRequest):
    """The main endpoint for the patient chat UI"""
    context = rag.retrieve_context(req.patient_id, req.message)
    response = agent.run_triage(req.patient_id, req.message, context, req.history)
    return {"reply": response}

@app.get("/appointments/doctor/{doctor_id}")
def get_doctor_appointments(doctor_id: int, db: Session = Depends(get_db)):
    """Fetches all upcoming appointments for a specific doctor, including patient details and AI summaries"""
    appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor_id).all()
    
    results = []
    for appt in appointments:
        patient = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
        results.append({
            "appointment_id": appt.id,
            "scheduled_time": appt.scheduled_time,
            "status": appt.status,
            "pre_consultation_summary": appt.pre_consultation_summary,
            "patient_name": patient.name if patient else "Unknown",
            "patient_age": patient.age if patient else "Unknown",
            "emergency_contact": f"{patient.emergency_contact_name} ({patient.emergency_contact_phone})" if patient and patient.emergency_contact_phone else "None Provided"
        })
    return {"appointments": results}

@app.get("/patients/{patient_id}/dashboard")
def get_patient_dashboard(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    history = db.query(models.MedicalHistory).filter(models.MedicalHistory.patient_id == patient_id).first()
    appointments = db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).all()
    
    # Enrich appointments with doctor info
    enriched_appts = []
    for a in appointments:
        doc = db.query(models.Doctor).filter(models.Doctor.id == a.doctor_id).first()
        enriched_appts.append({
            "id": a.id,
            "scheduled_time": a.scheduled_time,
            "status": a.status,
            "pre_consultation_summary": a.pre_consultation_summary,
            "diagnosis": a.diagnosis,
            "prescription": a.prescription,
            "doctor_name": doc.name if doc else "Unknown",
            "doctor_specialization": doc.specialization if doc else "Unknown"
        })
        
    return {
        "patient": {
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "email": patient.email,
            "emergency_contact": f"{patient.emergency_contact_name} ({patient.emergency_contact_phone})" if patient.emergency_contact_name else "None"
        },
        "medical_history": {
            "chronic_conditions": history.chronic_conditions if history else "None",
            "medications": history.medications if history else "None",
            "allergies": history.allergies if history else "None"
        },
        "appointments": enriched_appts
    }

from fastapi import UploadFile, File
import os
import PyPDF2
from langchain_core.messages import HumanMessage
import uuid

from fastapi.staticfiles import StaticFiles

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/patients/{patient_id}/documents")
async def upload_document(patient_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save file
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    # Parse text or prepare image for AI
    import base64
    
    prompt_text = """You are a highly precise medical transcription and summarization AI.
Analyze the following medical report or prescription image with extreme care. 

CRITICAL RULES:
1. DO NOT infer, guess, or add ANY information that is not explicitly visible in the image.
2. If handwriting is uncertain or illegible, you MUST explicitly mark it as "[Unclear]" rather than guessing.
3. Preserve medication names, doses, timing, frequency, and duration EXACTLY as visible.
4. Separate printed text from handwritten follow-up instructions.
5. Extract ALL prescribed investigations (e.g., blood tests, ultrasounds, X-rays).

You MUST output your response strictly in the following format. First, provide a short 2-5 word descriptive title for the document based on its contents (e.g., "General Physician Prescription", "CBC Blood Report", "Abdominal Ultrasound Report"). Then, provide the summary.

Title: [Your Short Descriptive Title Here]

Summary:
From the document, I can identify the following (some handwritten sections may be marked as [Unclear] if not safely legible):

Patient details:
- Name: [Extract Name]
- Age/Sex: [Extract Age/Sex]
- Hospital/Clinic: [Extract Hospital/Clinic]
- Doctors listed: [Extract Doctors]

Complaints & Observations:
- [List all symptoms, durations, and physical exam findings precisely]
- [Note any comorbidities or past history mentioned]

Prescribed Investigations:
- [List all tests precisely]

Prescription / Treatment:
- [Medication 1: Name, dose, timing, frequency, duration]
- [Medication 2...]

Advice & Follow-up (Handwritten / Printed):
- [List all specific advice]
- [Follow-up instructions]

Do not give medical advice. Keep the formatting neat and evenly spaced."""
    
    content_payload = []
    
    if file_extension.lower() == "pdf":
        extracted_text = ""
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                extracted_text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()])
        except Exception:
            extracted_text = "Could not parse document text."
        content_payload = prompt_text + f"\n\nReport Text:\n{extracted_text[:3000]}"
    elif file_extension.lower() in ["jpg", "jpeg", "png", "webp"]:
        # Pass image to Gemini Vision
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        mime_type = "image/jpeg" if file_extension.lower() in ["jpg", "jpeg"] else f"image/{file_extension.lower()}"
        content_payload = [
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded_string}"}}
        ]
    else:
        content_payload = prompt_text + f"\n\n(No readable text found for {file.filename})"
        
    try:
        from agent import llm
        response = llm.invoke([HumanMessage(content=content_payload)])
        
        # Safely extract text if response.content is a list
        content = response.content
        if isinstance(content, list):
            text_parts = []
            for block in content:
                if isinstance(block, dict) and "text" in block:
                    text_parts.append(block["text"])
                elif isinstance(block, str):
                    text_parts.append(block)
            raw_text = "\n".join(text_parts)
        elif isinstance(content, str):
            raw_text = content
        else:
            raw_text = str(content)
            
        # Parse Title and Summary
        doc_title = file.filename
        layman_summary = raw_text
        
        if "Title:" in raw_text and "Summary:" in raw_text:
            parts = raw_text.split("Summary:", 1)
            title_part = parts[0].replace("Title:", "").strip()
            if title_part:
                doc_title = title_part
            layman_summary = parts[1].strip()
            
    except Exception as e:
        layman_summary = "AI Summary unavailable at the moment."
        doc_title = file.filename
        
    # Save to DB
    new_doc = models.Document(
        patient_id=patient_id,
        filename=doc_title,
        file_url=f"/uploads/{unique_filename}",
        layman_summary=layman_summary
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # Optionally, also add this summary to the RAG vector store so the triage bot knows about it!
    rag.add_patient_history(patient_id, f"Recent uploaded report ({file.filename}) summary: {layman_summary}")
    
    # Auto-update Health Profile
    try:
        med_hist = db.query(models.MedicalHistory).filter(models.MedicalHistory.patient_id == patient_id).first()
        if not med_hist:
            med_hist = models.MedicalHistory(patient_id=patient_id, chronic_conditions="", medications="", allergies="")
            db.add(med_hist)
            db.commit()
            db.refresh(med_hist)
            
        update_prompt = f"""You are a medical data extraction AI.
The patient has just uploaded a new medical document with the following summary:
{layman_summary}

Based on this new document, update the patient's existing health profile ONLY if new, verified information is present.
Do not overwrite or delete existing valid information; append or refine it.
If the document mentions any allergies, chronic conditions, or active medications, add them to the profile.
If it mentions stopping a medication, remove or note it.

Existing Profile:
- Chronic Conditions: {med_hist.chronic_conditions}
- Medications: {med_hist.medications}
- Allergies: {med_hist.allergies}

Return ONLY valid JSON using exactly this schema (no markdown formatting like ```json):
{{
  "chronic_conditions": "String (Updated comma-separated list)",
  "medications": "String (Updated comma-separated list)",
  "allergies": "String (Updated comma-separated list)"
}}
"""
        import json
        update_response = llm.invoke([HumanMessage(content=update_prompt)])
        raw_text_update = update_response.content
        if isinstance(raw_text_update, list):
            raw_text_update = "".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in raw_text_update])
        else:
            raw_text_update = str(raw_text_update)
            
        raw_text_update = raw_text_update.strip()
        if raw_text_update.startswith("```json"): raw_text_update = raw_text_update[7:]
        elif raw_text_update.startswith("```"): raw_text_update = raw_text_update[3:]
        if raw_text_update.endswith("```"): raw_text_update = raw_text_update[:-3]
        
        parsed_update = json.loads(raw_text_update.strip())
        
        if "chronic_conditions" in parsed_update and parsed_update["chronic_conditions"].strip():
            med_hist.chronic_conditions = parsed_update["chronic_conditions"]
        if "medications" in parsed_update and parsed_update["medications"].strip():
            med_hist.medications = parsed_update["medications"]
        if "allergies" in parsed_update and parsed_update["allergies"].strip():
            med_hist.allergies = parsed_update["allergies"]
            
        db.commit()
    except Exception as e:
        print(f"Failed to auto-update medical history: {e}")
    
    return {"status": "success", "document_id": new_doc.id, "summary": layman_summary, "file_url": new_doc.file_url}

@app.get("/patients/{patient_id}/generate-summary")
def generate_ai_summary(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    docs = db.query(models.Document).filter(models.Document.patient_id == patient_id).all()
    doc_text = "\n".join([f"- {d.filename}: {d.layman_summary}" for d in docs])
    
    prompt = f"""You are an expert medical AI assistant.
Generate a comprehensive, professional "1-Click Medical Dossier" for the following patient in STRICT JSON FORMAT. This will be shown to doctors or emergency responders.
Make it highly structured, easy to read, and include all of the provided context. Do NOT invent information.

Patient Details:
Name: {patient.name}
Age/Gender: {patient.age} / {patient.gender}
Emergency Contact: {patient.emergency_contact_name} ({patient.emergency_contact_phone})

Medical History:
Conditions: {patient.medical_history.chronic_conditions if patient.medical_history else 'None'}
Medications: {patient.medical_history.medications if patient.medical_history else 'None'}
Allergies: {patient.medical_history.allergies if patient.medical_history else 'None'}

Uploaded Documents/Reports:
{doc_text if doc_text else "No uploaded documents."}

You MUST output ONLY valid JSON using exactly this schema (do not include markdown formatting like ```json):
{{
  "alerts": ["list of critical warnings like severe allergies, abnormal vitals, or mismatches"],
  "patient_snapshot": {{
    "demographics": "String",
    "primary_complaints": ["String"],
    "associated_symptoms": ["String"],
    "physical_exam": ["String"],
    "chronic_history": ["String"]
  }},
  "active_prescriptions": [
    {{
      "category": "String (e.g. Gastrointestinal, Respiratory)",
      "medications": [
        {{"name": "String", "dosage": "String", "frequency": "String", "timing": "String", "duration": "String"}}
      ]
    }}
  ],
  "pending_investigations": [
    {{
      "category": "String (e.g. Pathology, Imaging)",
      "tests": ["String"]
    }}
  ],
  "instructions": ["String (Dietary, specific protocols)"],
  "follow_up": "String (e.g. Check-in after 3 days)"
}}
"""
    try:
        from agent import llm
        import json
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content
        
        raw_text = ""
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and "text" in block:
                    raw_text += block["text"]
                elif isinstance(block, str):
                    raw_text += block
        else:
            raw_text = str(content)
            
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"): raw_text = raw_text[7:]
        elif raw_text.startswith("```"): raw_text = raw_text[3:]
        if raw_text.endswith("```"): raw_text = raw_text[:-3]
        
        parsed_json = json.loads(raw_text.strip())
        return {"summary": parsed_json}
    except Exception as e:
        return {"summary": {"error": f"Failed to generate AI summary: {str(e)}"}}

@app.get("/patients/{patient_id}/documents")
def get_documents(patient_id: int, db: Session = Depends(get_db)):
    docs = db.query(models.Document).filter(models.Document.patient_id == patient_id).order_by(models.Document.upload_time.desc()).all()
    return {"documents": [{"id": d.id, "filename": d.filename, "summary": d.layman_summary, "upload_time": d.upload_time, "file_url": d.file_url} for d in docs]}

@app.delete("/patients/{patient_id}/documents/{document_id}")
def delete_document(patient_id: int, document_id: int, db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == document_id, models.Document.patient_id == patient_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    db.delete(doc)
    db.commit()
    return {"status": "success"}
