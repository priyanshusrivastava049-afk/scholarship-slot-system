import { useState } from "react";
import "./App.css";

type Booking = {
  id: number;
  bookingCode: string;
  status: string;
  student: {
    id: number;
    admissionNo: string;
    fullName: string;
  };
  slot: {
    startAt: string;
    endAt: string;
    venue: { name: string; building: string };
    faculty: { fullName: string };
  };
};

type ApiResponse = {
  success: boolean;
  message?: string;
  booking?: Booking;
};

type DocumentItem = {
  id: number;
  title: string;
  note?: string;
  conditional?: boolean;
};

const documents: DocumentItem[] = [
  {
    id: 1,
    title: "Printed Renewal Application Form",
    note: "Use A4 portrait format. Write your admission number in BOLD at the top-right corner.",
  },
  {
    id: 2,
    title: "Counselling Letter and JEE Rank Card",
    note: "Required if admitted through counselling.",
    conditional: true,
  },
  {
    id: 3,
    title: "10th, 12th and Last Qualifying Examination Mark Sheets and Certificates",
    note: "Include Diploma or PG documents where applicable.",
  },
  {
    id: 4,
    title: "Bank Passbook Copy",
    note: "UP district bank account.",
  },
  {
    id: 5,
    title: "Verified Copy of 10th Mark Sheet",
    note: "Verification from the CBSE, ICSE, UP or relevant board website.",
  },
  {
    id: 6,
    title: "Previously Submitted Income Certificate",
  },
  {
    id: 7,
    title: "Verified Copy of Income Certificate",
    note: "Verification: edistrict.up.nic.in or bor.up.nic.in.",
  },
  {
    id: 8,
    title: "Income / Employment Proof",
    note: "Mandatory. Submit the applicable proof: service pay slip (government/private), pension proof with bank statement, ITR for business owners, or e-Shram card for labourers.",
  },
  {
    id: 9,
    title: "Caste Certificate",
    note: "Issued by a competent authority.",
  },
  {
    id: 10,
    title: "Verified Copy of Caste Certificate",
    note: "Verification: edistrict.up.nic.in or bor.up.nic.in.",
  },
  {
    id: 11,
    title: "Domicile Certificate",
    note: "Issued by a competent authority.",
  },
  {
    id: 12,
    title: "Verified Copy of Domicile Certificate",
    note: "Verification: edistrict.up.nic.in or bor.up.nic.in.",
  },
  {
    id: 13,
    title: "Aadhaar Card Copy",
  },
  {
    id: 14,
    title: "Academic and Hostel Fee Receipt Copies",
  },
  {
    id: 15,
    title: "Affidavit on ₹10 Stamp Paper",
    note: "Use the enclosed format, available at college stationery shops.",
  },
  {
    id: 16,
    title: "Last Year Scholarship Status Copy",
    note: "For renewal applicants; available on the Scholarship website.",
    conditional: true,
  },
  {
    id: 17,
    title: 'Praroop "Cha"',
    note: "Use the prescribed format available with the application or at the college stationery shop.",
  },
];

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateString));
}

function App() {
  const [studentId, setStudentId] = useState("1");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedDocuments, setCheckedDocuments] = useState<number[]>([]);
  const [isRenewal, setIsRenewal] = useState(true);
  const [admittedThroughCounselling, setAdmittedThroughCounselling] =
    useState(false);

  const applicableDocuments = documents.filter((document) => {
    if (document.id === 2) return admittedThroughCounselling;
    if (document.id === 16) return isRenewal;
    return true;
  });

  const checkedCount = applicableDocuments.filter((document) =>
    checkedDocuments.includes(document.id)
  ).length;

  function toggleDocument(id: number) {
    setCheckedDocuments((previous) =>
      previous.includes(id)
        ? previous.filter((documentId) => documentId !== id)
        : [...previous, id]
    );
  }

  async function findBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = Number(studentId);

    if (!Number.isInteger(id) || id <= 0) {
      setError("Please enter a valid student ID.");
      setBooking(null);
      return;
    }

    setLoading(true);
    setError("");
    setBooking(null);
    setCheckedDocuments([]);

   try {
  const response = await fetch(
    `http://localhost:5000/api/bookings/student/${id}`
  );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success || !data.booking) {
        throw new Error(
          data.message || "Could not retrieve booking details."
        );
      }

      setBooking(data.booking);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header className="page-header">
        <p className="eyebrow">STUDENT PORTAL</p>
        <h1>Scholarship Slot System</h1>
        <p className="subtitle">
          Student verification and slot allocation portal
        </p>
      </header>

      <section className="search-card no-print">
        <h2>Find your booking</h2>
        <p>Enter your student ID to view your verification details.</p>

        <form onSubmit={findBooking} className="search-form">
          <label htmlFor="studentId">Student ID</label>
          <input
            id="studentId"
            type="number"
            min="1"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            placeholder="Enter student ID"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Finding booking..." : "View booking"}
          </button>
        </form>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>

      {booking && (
        <>
          <section className="booking-card">
            <div className="booking-header">
              <div>
                <p className="eyebrow">CONFIRMATION SLIP</p>
                <h2>Scholarship Verification</h2>
              </div>
              <span className="status-badge">{booking.status}</span>
            </div>

            <div className="booking-code">
              <p>BOOKING REFERENCE</p>
              <strong>{booking.bookingCode}</strong>
            </div>

            <div className="details-grid">
              <div className="detail">
                <span className="detail-label">Student name</span>
                <strong>{booking.student.fullName}</strong>
              </div>

              <div className="detail">
                <span className="detail-label">Admission number</span>
                <strong>{booking.student.admissionNo}</strong>
              </div>

              <div className="detail">
                <span className="detail-label">Verification date</span>
                <strong>{formatDate(booking.slot.startAt)}</strong>
              </div>

              <div className="detail">
                <span className="detail-label">Verification time</span>
                <strong>
                  {formatTime(booking.slot.startAt)} –{" "}
                  {formatTime(booking.slot.endAt)} IST
                </strong>
              </div>

              <div className="detail">
                <span className="detail-label">Venue</span>
                <strong>{booking.slot.venue.name}</strong>
                <span>{booking.slot.venue.building}</span>
              </div>

              <div className="detail">
                <span className="detail-label">Assigned faculty</span>
                <strong>{booking.slot.faculty.fullName}</strong>
              </div>
            </div>

            <div className="notice">
              <strong>Before your visit</strong>
              <p>
                Arrange your documents in the exact order shown in the
                checklist below. Bring the required documents for verification
                and keep your booking reference available.
              </p>
            </div>
          </section>

          <section className="documents-card">
            <div className="documents-header">
              <div>
                <p className="eyebrow">DOCUMENT PREPARATION</p>
                <h2>Required Document Checklist</h2>
                <p>
                  Arrange documents in the specified order before attaching
                  them to your application.
                </p>
              </div>

              <div className="checklist-progress">
                <strong>
                  {checkedCount}/{applicableDocuments.length}
                </strong>
                <span>checked</span>
              </div>
            </div>

            <div className="applicant-options no-print">
              <label className="option-row">
                <input
                  type="checkbox"
                  checked={isRenewal}
                  onChange={(event) => setIsRenewal(event.target.checked)}
                />
                <span>I am a renewal applicant</span>
              </label>

              <label className="option-row">
                <input
                  type="checkbox"
                  checked={admittedThroughCounselling}
                  onChange={(event) =>
                    setAdmittedThroughCounselling(event.target.checked)
                  }
                />
                <span>I was admitted through counselling</span>
              </label>
            </div>

            <ol className="document-list">
              {applicableDocuments.map((document) => (
                <li key={document.id} className="document-item">
                  <label className="document-label">
                    <input
                      className="document-checkbox no-print"
                      type="checkbox"
                      checked={checkedDocuments.includes(document.id)}
                      onChange={() => toggleDocument(document.id)}
                    />

                    <span className="document-content">
                      <strong>{document.title}</strong>

                      {document.id === 8 && (
                        <span className="mandatory-label">MANDATORY</span>
                      )}

                      {document.note && (
                        <span className="document-note">{document.note}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ol>

            <div className="notice">
              <strong>Important</strong>
              <p>
                The checkboxes are for your personal preparation only.
                They do not submit documents to the college or confirm that
                your documents have been officially verified.
              </p>
            </div>

            <div className="document-actions no-print">
              <button
                type="button"
                className="print-button"
                onClick={() => window.print()}
              >
                Print booking slip and checklist
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setCheckedDocuments([])}
              >
                Reset checklist
              </button>
            </div>
          </section>
        </>
      )}

      <footer className="page-footer">
        Scholarship Slot Allocation System
      </footer>
    </main>
  );
}

export default App;
