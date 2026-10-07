from sqlalchemy.orm import Session
import models, schemas

def get_doctors(db: Session):
    return db.query(models.Doctor).all()

def create_patient(db: Session, patient: schemas.PatientCreate):
    db_patient = models.Patient(
        name=patient.name,
        age=patient.age,
        gender=patient.gender,
        email=patient.email,
        emergency_contact_name=patient.emergency_contact_name,
        emergency_contact_phone=patient.emergency_contact_phone,
        primary_doctor_id=patient.primary_doctor_id,
        google_access_token=patient.google_access_token
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    db_history = models.MedicalHistory(
        patient_id=db_patient.id,
        chronic_conditions=patient.medical_history.chronic_conditions,
        medications=patient.medical_history.medications,
        allergies=patient.medical_history.allergies
    )
    db.add(db_history)
    db.commit()
    return db_patient

def create_appointment(db: Session, appointment: schemas.AppointmentCreate):
    db_appointment = models.Appointment(
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        scheduled_time=appointment.scheduled_time,
        pre_consultation_summary=appointment.pre_consultation_summary
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    return db_appointment
