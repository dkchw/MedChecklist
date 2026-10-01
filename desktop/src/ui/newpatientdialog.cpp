#include "newpatientdialog.h"
#include <QVBoxLayout>
#include <QFormLayout>
#include <QDialogButtonBox>
#include <QUuid>
#include <QDateTime>

NewPatientDialog::NewPatientDialog(QWidget *parent) : QDialog(parent) {
    setWindowTitle("New Patient Admission");
    setMinimumWidth(400);

    QVBoxLayout *mainLayout = new QVBoxLayout(this);
    QFormLayout *form = new QFormLayout();

    m_identifierEdit = new QLineEdit(this);
    m_identifierEdit->setPlaceholderText("e.g. Bed 4 - Smith, J.");
    form->addRow("Patient Identifier *:", m_identifierEdit);

    m_bedEdit = new QLineEdit(this);
    m_bedEdit->setPlaceholderText("e.g. 4");
    form->addRow("Bed Number:", m_bedEdit);

    m_wardEdit = new QLineEdit(this);
    m_wardEdit->setPlaceholderText("e.g. Cardiology Ward, ICU");
    form->addRow("Ward / Department:", m_wardEdit);

    m_facilityEdit = new QLineEdit(this);
    m_facilityEdit->setPlaceholderText("e.g. City General Hospital");
    form->addRow("Hospital / Facility:", m_facilityEdit);

    m_chiefComplaintEdit = new QTextEdit(this);
    m_chiefComplaintEdit->setPlaceholderText("Primary diagnosis or presenting symptoms...");
    m_chiefComplaintEdit->setMaximumHeight(80);
    form->addRow("Chief Complaint:", m_chiefComplaintEdit);

    mainLayout->addLayout(form);

    QDialogButtonBox *btnBox = new QDialogButtonBox(
        QDialogButtonBox::Ok | QDialogButtonBox::Cancel,
        Qt::Horizontal,
        this
    );
    connect(btnBox, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(btnBox, &QDialogButtonBox::rejected, this, &QDialog::reject);
    mainLayout->addWidget(btnBox);
}

PatientEncounter NewPatientDialog::getEncounter() const {
    PatientEncounter enc;
    enc.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    enc.patientIdentifier = m_identifierEdit->text().trimmed();
    enc.bedNumber = m_bedEdit->text().trimmed();
    enc.group = m_wardEdit->text().trimmed();
    enc.facility = m_facilityEdit->text().trimmed();
    enc.chiefComplaint = m_chiefComplaintEdit->toPlainText().trimmed();
    enc.status = "active";
    enc.isPinned = false;
    enc.pagesCount = 1;
    enc.createdAt = QDateTime::currentMSecsSinceEpoch();
    enc.updatedAt = QDateTime::currentMSecsSinceEpoch();
    return enc;
}
