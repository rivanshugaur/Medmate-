from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    email = Column(String, unique=True, index=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    primary_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    google_access_token = Column(String, nullable=True)
    
    medical_history = relationship("MedicalHistory", back_populates="patient", uselist=False)
    appointments = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    primary_doctor = relationship("Doctor", foreign_keys="Patient.primary_doctor_id")

class MedicalHistory(Base):
    __tablename__ = "medical_histories"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    chronic_conditions = Column(Text)
    medications = Column(Text)
    allergies = Column(Text)
    
    patient = relationship("Patient", back_populates="medical_history")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    specialization = Column(String)
    email = Column(String, unique=True, index=True)
    available_days = Column(String) # e.g., "Mon,Tue,Wed,Thu,Fri"
    bio = Column(Text)
    
    appointments = relationship("Appointment", back_populates="doctor")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    scheduled_time = Column(DateTime)
    status = Column(String, default="scheduled")
    pre_consultation_summary = Column(Text)
    diagnosis = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    google_calendar_event_id = Column(String, nullable=True)
    
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    filename = Column(String)
    file_url = Column(String, nullable=True)
    layman_summary = Column(Text)
    upload_time = Column(DateTime, default=datetime.datetime.utcnow)
    
    patient = relationship("Patient")
