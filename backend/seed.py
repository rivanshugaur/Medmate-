import models, database
import datetime

def seed():
    # Drop and recreate tables to ensure clean slate
    models.Base.metadata.drop_all(bind=database.engine)
    models.Base.metadata.create_all(bind=database.engine)
    
    db = database.SessionLocal()

    # Seed Doctors
    doctors = [
        models.Doctor(name="Dr. Smith", specialization="Cardiologist", email="smith@example.com", available_days="Mon,Wed,Fri", bio="Expert in heart conditions, hypertension, and preventive cardiology. 15 years of experience at top hospitals."),
        models.Doctor(name="Dr. Jones", specialization="General Physician", email="jones@example.com", available_days="Tue,Thu", bio="Focuses on holistic care, immune system support, and general diagnostics."),
        models.Doctor(name="Dr. Emily Chen", specialization="Endocrinologist", email="echen@example.com", available_days="Mon,Tue,Thu", bio="Specializes in diabetes management, thyroid disorders, and metabolic health."),
        models.Doctor(name="Dr. Sarah Connor", specialization="Neurologist", email="sconnor@example.com", available_days="Wed,Fri", bio="Leading expert in migraines, nervous system disorders, and stroke rehabilitation.")
    ]
    db.add_all(doctors)
    db.commit()

    # Seed Patients
    patients = [
        models.Patient(name="Ramesh Kumar", age=45, gender="Male", email="ramesh@example.com", emergency_contact_name="Sunita Kumar", emergency_contact_phone="9876543210", primary_doctor_id=3),
        models.Patient(name="Priya Sharma", age=32, gender="Female", email="priya@example.com", emergency_contact_name="Rahul Sharma", emergency_contact_phone="9988776655", primary_doctor_id=2),
        models.Patient(name="Rajesh Singh", age=58, gender="Male", email="rajesh@example.com", emergency_contact_name="Amit Singh", emergency_contact_phone="9123456789", primary_doctor_id=1)
    ]
    db.add_all(patients)
    db.commit()

    # Seed Medical Histories
    histories = [
        models.MedicalHistory(patient_id=1, chronic_conditions="Type 2 Diabetes, Mild Hypertension", medications="Metformin 500mg, Amlodipine 5mg", allergies="Penicillin"),
        models.MedicalHistory(patient_id=2, chronic_conditions="Asthma", medications="Albuterol Inhaler", allergies="Dust, Pollen"),
        models.MedicalHistory(patient_id=3, chronic_conditions="Coronary Artery Disease", medications="Aspirin 81mg, Atorvastatin 40mg", allergies="None")
    ]
    db.add_all(histories)
    db.commit()

    # Seed Past Appointments
    past_date_1 = datetime.datetime.now() - datetime.timedelta(days=14)
    past_date_2 = datetime.datetime.now() - datetime.timedelta(days=30)
    
    past_appts = [
        models.Appointment(
            patient_id=1, doctor_id=3, scheduled_time=past_date_1, status="completed", 
            pre_consultation_summary="Routine diabetes checkup. Patient reports occasional fatigue.",
            diagnosis="Blood sugar levels slightly elevated. Type 2 Diabetes stable.",
            prescription="Continue Metformin 500mg daily. Increase water intake."
        ),
        models.Appointment(
            patient_id=2, doctor_id=2, scheduled_time=past_date_2, status="completed", 
            pre_consultation_summary="Follow-up for seasonal asthma exacerbation.",
            diagnosis="Mild allergic asthma trigger.",
            prescription="Albuterol Inhaler as needed. Added daily antihistamine (Cetirizine 10mg) during peak pollen season."
        ),
        models.Appointment(
            patient_id=3, doctor_id=1, scheduled_time=past_date_1, status="completed", 
            pre_consultation_summary="Post-surgery cardiac evaluation.",
            diagnosis="Healing well post-op. Vitals are within normal ranges.",
            prescription="Continue Aspirin 81mg and Atorvastatin 40mg. Follow up in 3 months."
        )
    ]
    db.add_all(past_appts)
    db.commit()
    
    db.close()
    print("Database seeded with robust artificial data for the panel!")

if __name__ == "__main__":
    seed()
