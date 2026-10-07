from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Patients ---
class MedicalHistoryBase(BaseModel):
    chronic_conditions: str
    medications: str
    allergies: str

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    email: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    primary_doctor_id: Optional[int] = None
    google_access_token: Optional[str] = None

class PatientCreate(PatientBase):
    medical_history: MedicalHistoryBase

class PatientLogin(BaseModel):
    email: str

class PatientUpdate(BaseModel):
    name: str
    age: int
    gender: str
    email: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    chronic_conditions: str
    medications: str
    allergies: str

class Patient(PatientBase):
    id: int
    
    class Config:
        from_attributes = True

# --- Doctors ---
class DoctorBase(BaseModel):
    name: str
    specialization: str
    email: str
    available_days: str
    bio: str

class Doctor(DoctorBase):
    id: int
    
    class Config:
        from_attributes = True

# --- Appointments ---
class AppointmentBase(BaseModel):
    doctor_id: int
    scheduled_time: datetime
    pre_consultation_summary: str

class AppointmentCreate(AppointmentBase):
    patient_id: int

class Appointment(AppointmentBase):
    id: int
    patient_id: int
    status: str
    google_calendar_event_id: Optional[str] = None
    
    class Config:
        from_attributes = True
