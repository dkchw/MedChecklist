#ifndef NEWPATIENTDIALOG_H
#define NEWPATIENTDIALOG_H

#include <QDialog>
#include <QLineEdit>
#include <QTextEdit>
#include "../models/datamodels.h"

class NewPatientDialog : public QDialog {
    Q_OBJECT

public:
    explicit NewPatientDialog(QWidget *parent = nullptr);

    PatientEncounter getEncounter() const;

private:
    QLineEdit *m_identifierEdit;
    QLineEdit *m_bedEdit;
    QLineEdit *m_facilityEdit;
    QLineEdit *m_wardEdit;
    QTextEdit *m_chiefComplaintEdit;
};

#endif // NEWPATIENTDIALOG_H
