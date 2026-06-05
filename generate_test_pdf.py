"""Generate a sample medical bill PDF that will be APPROVED by the adjudication engine."""
from fpdf import FPDF
from datetime import datetime

today = datetime.now().strftime("%d/%m/%Y")
today_iso = datetime.now().strftime("%Y-%m-%d")

pdf = FPDF()
pdf.add_page()

# ---- Hospital Header ----
pdf.set_font("Helvetica", "B", 18)
pdf.cell(0, 12, "Max Healthcare", ln=True, align="C")
pdf.set_font("Helvetica", "", 10)
pdf.cell(0, 6, "Saket, New Delhi - 110017 | Ph: 011-26515050", ln=True, align="C")
pdf.cell(0, 6, "NABH Accredited | Network Hospital", ln=True, align="C")
pdf.ln(6)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)

# ---- Title ----
pdf.set_font("Helvetica", "B", 14)
pdf.cell(0, 10, "OPD CONSULTATION - MEDICAL BILL CUM PRESCRIPTION", ln=True, align="C")
pdf.ln(4)

# ---- Patient Details ----
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 8, "PATIENT DETAILS", ln=True)
pdf.set_font("Helvetica", "", 10)

details = [
    ("Patient Name", "Rajesh Kumar"),
    ("Age / Gender", "30 Years / Male"),
    ("Member ID", "EMP001"),
    ("Policy Status", "Active"),
    ("Date of Visit", today),
    ("Bill No", "MHC/OPD/2026/04521"),
]
for label, value in details:
    pdf.cell(50, 7, f"{label}:", 0)
    pdf.cell(0, 7, value, ln=True)

pdf.ln(4)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)

# ---- Doctor Details ----
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 8, "CONSULTING DOCTOR", ln=True)
pdf.set_font("Helvetica", "", 10)

doc_details = [
    ("Doctor Name", "Dr. A. K. Sharma"),
    ("Registration No", "DL/12345/2018"),
    ("Specialization", "General Medicine"),
    ("Hospital/Clinic", "Max Healthcare"),
]
for label, value in doc_details:
    pdf.cell(50, 7, f"{label}:", 0)
    pdf.cell(0, 7, value, ln=True)

pdf.ln(4)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)

# ---- Diagnosis ----
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 8, "DIAGNOSIS & TREATMENT", ln=True)
pdf.set_font("Helvetica", "", 10)
pdf.cell(50, 7, "Diagnosis:", 0)
pdf.cell(0, 7, "Acute Upper Respiratory Tract Infection (J06.9)", ln=True)
pdf.cell(50, 7, "Treatment Type:", 0)
pdf.cell(0, 7, "OPD Consultation", ln=True)
pdf.cell(50, 7, "Procedures:", 0)
pdf.cell(0, 7, "OPD Consultation, Clinical Examination", ln=True)
pdf.cell(50, 7, "Service Category:", 0)
pdf.cell(0, 7, "Consultation", ln=True)

pdf.ln(4)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)

# ---- Prescription ----
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 8, "PRESCRIPTION (Rx)", ln=True)
pdf.set_font("Helvetica", "", 10)
pdf.cell(50, 7, f"Prescription Date:", 0)
pdf.cell(0, 7, today, ln=True)
pdf.ln(2)

prescriptions = [
    ("1.", "Tab. Paracetamol 500mg", "1 tablet thrice daily after meals x 5 days"),
    ("2.", "Tab. Cetirizine 10mg", "1 tablet at bedtime x 5 days"),
    ("3.", "Syp. Ambroxol 30mg/5ml", "10ml thrice daily x 5 days"),
]
pdf.set_font("Helvetica", "B", 10)
pdf.cell(10, 7, "No.", 1)
pdf.cell(70, 7, "Medication", 1)
pdf.cell(0, 7, "Dosage & Instructions", 1, ln=True)
pdf.set_font("Helvetica", "", 10)
for no, med, dosage in prescriptions:
    pdf.cell(10, 7, no, 1)
    pdf.cell(70, 7, med, 1)
    pdf.cell(0, 7, dosage, 1, ln=True)

pdf.ln(4)
pdf.line(10, pdf.get_y(), 200, pdf.get_y())
pdf.ln(4)

# ---- Bill / Invoice ----
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 8, "BILL / INVOICE", ln=True)
pdf.set_font("Helvetica", "", 10)
pdf.cell(50, 7, f"Bill Date:", 0)
pdf.cell(0, 7, today, ln=True)
pdf.ln(2)

items = [
    ("Consultation Fee", "1000.00"),
    ("Medicines (Pharmacy)", "350.00"),
    ("Registration Charges", "150.00"),
]

pdf.set_font("Helvetica", "B", 10)
pdf.cell(120, 7, "Description", 1)
pdf.cell(0, 7, "Amount (INR)", 1, ln=True)
pdf.set_font("Helvetica", "", 10)
for desc, amt in items:
    pdf.cell(120, 7, desc, 1)
    pdf.cell(0, 7, amt, 1, ln=True)

pdf.set_font("Helvetica", "B", 10)
pdf.cell(120, 7, "TOTAL CLAIM AMOUNT", 1)
pdf.cell(0, 7, "1,500.00", 1, ln=True)

pdf.ln(4)

# ---- Footer ----
pdf.set_font("Helvetica", "", 9)
pdf.cell(0, 7, f"Claim Submission Date: {today}", ln=True)
pdf.cell(0, 7, "Payment Mode: Cashless / Insurance Claim", ln=True)
pdf.ln(6)

pdf.set_font("Helvetica", "B", 10)
pdf.cell(95, 7, "Patient Signature", align="C")
pdf.cell(95, 7, "Dr. A. K. Sharma", align="C")
pdf.ln(5)
pdf.set_font("Helvetica", "", 9)
pdf.cell(95, 7, "Rajesh Kumar", align="C")
pdf.cell(95, 7, "Reg: DL/12345/2018", align="C")
pdf.ln(10)
pdf.set_font("Helvetica", "I", 8)
pdf.cell(0, 5, "This is a computer-generated document. No signature required.", ln=True, align="C")

output_path = r"c:\Users\maddi\OneDrive\Documents\plum_project\test_claim_approved.pdf"
pdf.output(output_path)
print(f"PDF generated: {output_path}")
