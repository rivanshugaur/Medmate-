import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import tool
from database import SessionLocal
import crud
import schemas
import models
import datetime
import requests

# Ensure GOOGLE_API_KEY is set in the environment before running
llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0)

@tool
def get_registered_doctors(query: str) -> str:
    """Use this tool to find available doctors in the portal database."""
    db = SessionLocal()
    doctors = crud.get_doctors(db)
    db.close()
    if not doctors:
        return "No doctors available in the portal."
    
    res = "Available Doctors in Portal:\n"
    for d in doctors:
        res += f"ID: {d.id} | Name: {d.name} | Specialization: {d.specialization} | Available: {d.available_days} | Bio: {d.bio}\n"
    return res

@tool
def book_appointment(args_str: str) -> str:
    """
    Use this tool to book an appointment. 
    You MUST provide exactly 4 comma-separated values: patient_id, doctor_id, YYYY-MM-DD HH:MM, summary
    Example: 1, 2, 2026-10-10 10:00, [DETAILED SUMMARY]
    
    CRITICAL: The 'summary' argument MUST be a highly detailed clinical note containing:
    1. History of Present Illness (HPI) - current symptoms, duration, severity.
    2. Past Medical History (PMH) - relevant chronic conditions, allergies, or past visits that might correlate with current symptoms.
    3. Suspected correlations (e.g. "Stomach ache may be related to their recent prescription of X").
    This is critical so the doctor can treat them from day one instead of wasting visits!
    """
    try:
        parts = [p.strip() for p in args_str.split(",")]
        if len(parts) < 4: 
            return "Error: Missing arguments. Need patient_id, doctor_id, time, summary."
        
        p_id = int(parts[0])
        d_id = int(parts[1])
        time_str = parts[2]
        # Join the rest in case the summary itself contains commas
        summary = ", ".join(parts[3:])
        
        sch_time = datetime.datetime.strptime(time_str, "%Y-%m-%d %H:%M")
        
        import urllib.parse
        
        db = SessionLocal()
        
        # Auto-inject the structured health profile and uploaded documents into the summary
        patient = db.query(models.Patient).filter(models.Patient.id == p_id).first()
        med_hist = db.query(models.MedicalHistory).filter(models.MedicalHistory.patient_id == p_id).first()
        docs = db.query(models.Document).filter(models.Document.patient_id == p_id).all()
        
        docs_context = ""
        if docs:
            docs_context = "\n".join([f"Document [{d.filename}]: {d.layman_summary}" for d in docs])
            
        profile_context = ""
        if med_hist:
            profile_context = f"Chronic Conditions: {med_hist.chronic_conditions}\nMedications: {med_hist.medications}\nAllergies: {med_hist.allergies}"
            
        # Use LLM to synthesize only RELEVANT information based on current HPI
        synthesis_prompt = f"""You are a clinical synthesis AI.
A patient is booking an appointment. The triage agent has summarized their current complaint (HPI) below:
{summary}

Patient's Full Health Profile:
{profile_context}

Patient's Uploaded Documents:
{docs_context if docs_context else "None"}

Your task: Output a highly structured JSON clinical note for the doctor.
1. Include the HPI (History of Present Illness) in the patient_snapshot.
2. ALWAYS include Allergies in the alerts, even if not relevant, for safety.
3. INCLUDE Chronic Conditions and Medications ONLY if they are relevant to the current complaint.
4. From the Uploaded Documents, extract and summarize ONLY the information that is highly relevant to the patient's current condition. Include this in the pending_investigations or a general notes section.

You MUST output ONLY valid JSON using exactly this schema:
{{
  "alerts": ["list of critical warnings like severe allergies, abnormal vitals"],
  "patient_snapshot": {{
    "demographics": "String",
    "primary_complaints": ["String (HPI summary)"],
    "associated_symptoms": ["String"],
    "physical_exam": ["String"],
    "chronic_history": ["String (Relevant only)"]
  }},
  "active_prescriptions": [
    {{
      "category": "String",
      "medications": [
        {{"name": "String", "dosage": "String", "frequency": "String", "timing": "String", "duration": "String"}}
      ]
    }}
  ],
  "pending_investigations": [
    {{
      "category": "String (e.g. From Document [Name])",
      "tests": ["String (Relevant findings)"]
    }}
  ],
  "instructions": ["String"],
  "follow_up": "String"
}}"""
        try:
            response = llm.invoke([HumanMessage(content=synthesis_prompt)])
            raw_content = response.content
            if isinstance(raw_content, list):
                final_summary = "".join([b.get("text", "") if isinstance(b, dict) else str(b) for b in raw_content])
            else:
                final_summary = str(raw_content)
                
            # clean ticks if present
            import re
            final_summary = re.sub(r"^```(?:json|markdown)?\s*", "", final_summary, flags=re.IGNORECASE)
            final_summary = re.sub(r"\s*```$", "", final_summary)
            final_summary = final_summary.strip()
        except Exception:
            # Fallback if LLM fails
            final_summary = summary + "\n\n--- 🏥 HEALTH PROFILE (Fallback) ---\n" + profile_context
        
        appt = schemas.AppointmentCreate(
            patient_id=p_id, 
            doctor_id=d_id, 
            scheduled_time=sch_time, 
            pre_consultation_summary=final_summary
        )
        created = crud.create_appointment(db, appt)
        
        patient = db.query(models.Patient).filter(models.Patient.id == p_id).first()
        access_token = patient.google_access_token if patient else None
        
        doctor = db.query(models.Doctor).filter(models.Doctor.id == d_id).first()
        doc_name = doctor.name if doctor else "Doctor"
        db.close()
        
        end_time = sch_time + datetime.timedelta(hours=1)
        
        # If user has authorized Google Calendar, insert directly
        if access_token:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            event_data = {
                "summary": f"MedMate Consultation: {doc_name}",
                "description": f"Pre-consultation summary: {summary}",
                "start": {
                    "dateTime": sch_time.isoformat() + "Z",
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_time.isoformat() + "Z",
                    "timeZone": "UTC"
                }
            }
            r = requests.post("https://www.googleapis.com/calendar/v3/calendars/primary/events", headers=headers, json=event_data)
            if r.status_code == 200:
                return f"SUCCESS: Appointment {created.id} booked with doctor {d_id} at {time_str}. The event was DIRECTLY added to the patient's Google Calendar! (No link needed, tell them it's on their calendar)."
            else:
                pass # fallback to manual link if token expired or failed
        
        start_fmt = sch_time.strftime("%Y%m%dT%H%M%S")
        end_fmt = end_time.strftime("%Y%m%dT%H%M%S")
        
        cal_url = f"https://calendar.google.com/calendar/render?action=TEMPLATE"
        cal_url += f"&text={urllib.parse.quote('MedMate Consultation: ' + doc_name)}"
        cal_url += f"&details={urllib.parse.quote('MedMate Telehealth Appointment.')}"
        cal_url += f"&dates={start_fmt}/{end_fmt}"
        
        return f"SUCCESS: Appointment {created.id} booked. IMPORTANT: You MUST output this EXACT Google Calendar link so the patient can click it to add to their calendar manually: {cal_url}"
    except Exception as e:
        return f"Booking failed: {str(e)}"

@tool
def escalate_to_emergency(args_str: str) -> str:
    """Use this tool ONLY if symptoms are critical or life-threatening. You MUST provide a comma-separated string: patient_id, reason"""
    try:
        parts = [p.strip() for p in args_str.split(",")]
        p_id = int(parts[0])
        reason = parts[1] if len(parts) > 1 else "Critical Medical Emergency"
        
        db = SessionLocal()
        patient = db.query(models.Patient).filter(models.Patient.id == p_id).first()
        
        msg = f"\n🚨 [EMERGENCY PROTOCOL ACTIVATED] 🚨\n"
        if patient:
            if patient.emergency_contact_phone:
                msg += f"📲 [MOCK SMS] Sent to {patient.emergency_contact_name} ({patient.emergency_contact_phone}): '{patient.name} is experiencing a medical emergency: {reason}. Please check on them immediately.'\n"
            else:
                msg += f"📲 [MOCK SMS] No emergency contact found for {patient.name}.\n"
                
            if patient.primary_doctor_id:
                doc = db.query(models.Doctor).filter(models.Doctor.id == patient.primary_doctor_id).first()
                if doc:
                    msg += f"🏥 [MOCK PAGER] Sent to Dr. {doc.name}: 'Your patient {patient.name} reported critical symptoms: {reason}.'\n"
            else:
                msg += f"🏥 [MOCK PAGER] No primary doctor assigned in portal for {patient.name}.\n"
        db.close()
        return msg + "Emergency protocol activated. Caregivers and emergency services have been notified."
    except Exception as e:
        return f"Emergency protocol activated, but failed to fetch contacts: {str(e)}"

tools = [get_registered_doctors, book_appointment, escalate_to_emergency]

from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage, HumanMessage

tools = [get_registered_doctors, book_appointment, escalate_to_emergency]
agent_executor = create_react_agent(llm, tools)

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

def run_triage(patient_id: int, current_symptoms: str, patient_history_context: str, chat_history: list) -> str:
    system_prompt = """
You are an intelligent, empathetic medical triage assistant.
You assess symptoms based on the patient's medical history.

CRITICAL RULE: DO NOT show doctors or book appointments immediately. 
Step 1: Talk to the patient. Ask 1 or 2 clarifying questions about their current symptoms to fully understand the problem (duration, severity on a scale of 1-10, related symptoms).
Step 2: Once you understand the problem, assess the severity.
Step 3: If CRITICAL or LIFE-THREATENING (Severity 8-10), use the escalate_to_emergency tool immediately.
Step 4: If VERY MILD (Severity 1-3, e.g., mild headache, minor cold, small scrape): Provide safe home remedies, lifestyle advice, and general over-the-counter guidelines based STRICTLY on official protocols from the WHO, ICMR, or the Indian Ministry of Health and Family Welfare. You MUST include a brief disclaimer that this is general health advice and not a substitute for professional medical evaluation. Ask if they feel they still need to see a doctor.
Step 5: If MODERATE (Severity 4-7) or if a patient with mild symptoms requests to see a doctor, use the get_registered_doctors tool. Present the best doctors along with their bios. YOU MUST add the exact text `[SHOW_CAROUSEL]` at the very end of your message.
Step 6: Ask the patient to confirm a doctor and a time (YYYY-MM-DD HH:MM). CRITICAL: You MUST book the exact doctor the user chooses. Do not override their choice.
Step 7: Use the book_appointment tool. YOU MUST WRITE A HIGHLY DETAILED CLINICAL NOTE FOR THE SUMMARY. Do not write a one-liner. You MUST include:
  - History of Present Illness (HPI)
  - Past Medical History (PMH)
  - Summarize any relevant Uploaded Documents or Reports found in the patient's history context.
  - Potential correlations between their current issue, past problems, and test reports.
  This detailed information is essential for the doctor to provide immediate, accurate care.

--- CONTEXT PRIORITY ---
When generating a patient-specific answer, prioritize information in this order:
1. Current clinical encounter / latest verified report
2. Recent laboratory and diagnostic results
3. Active medication list
4. Established allergies
5. Longitudinal medical history
6. Older historical records
7. General medical knowledge

Patient-specific information should take precedence over generic assumptions, but only when the patient-specific information is actually documented and relevant.
When two records conflict, do not silently choose one. Mention the conflict and identify which record is newer.

--- RETRIEVAL REQUIREMENT ---
For patient-specific questions, do NOT answer solely from pretrained knowledge or conversation history. You MUST rely on the retrieved patient records provided in the History context.
If the provided patient records do not contain sufficient information to answer a specific question, explicitly state that the patient's records do not contain sufficient information rather than filling the gap with assumptions.
"""
    human_prompt = f"Patient ID: {patient_id}\nHistory: {patient_history_context}\n\nCurrent Symptoms: {current_symptoms}"
    
    messages = [SystemMessage(content=system_prompt)]
    
    for msg in chat_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "bot":
            messages.append(AIMessage(content=msg["content"]))
            
    messages.append(HumanMessage(content=human_prompt))
    
    result = agent_executor.invoke({"messages": messages})
    final_message = result["messages"][-1]
    
    content = final_message.content
    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                text_parts.append(block["text"])
            elif isinstance(block, str):
                text_parts.append(block)
        return "\n".join(text_parts)
    elif isinstance(content, str):
        return content
    else:
        return str(content)
