# CSU EventLink

You are a senior full-stack software architect and developer. Build a complete, production-ready capstone project titled:

"QR Code-Enabled Student Organization Event and Attendance Management System for Catanduanes State University"

The system is a web-based event and attendance management platform for Catanduanes State University. Its primary purpose is to allow students to discover and register for organization events, use QR codes for attendance, submit event evaluations, and receive certificates when qualified. Organization Officers manage their organization events, participants, QR attendance, certificates, notifications, and reports. Admin manages users, student organizations, event approvals, monitoring, reports, and system maintenance.

IMPORTANT:

Do not add features that are not required by the system scope. Keep the system practical, clean, maintainable, and suitable for a capstone project.

==================================================

1. USER ROLES

==================================================

The system has three main user roles:

1. Student

2. Organization Officer

3. Admin

Do not create unnecessary additional user roles such as Staff unless explicitly required.

==================================================

2. SYSTEM ARCHITECTURE

==================================================

Use a clean client-server architecture.

Recommended technology stack:

Frontend:

- Next.js

- TypeScript

- Tailwind CSS

- shadcn/ui

Backend:

- Next.js server-side application/API layer

- Server-side business logic

- Proper authentication and authorization

Database:

- MySQL or PostgreSQL

- Prisma ORM

Authentication:

- Secure session-based authentication

- Role-based access control

The architecture should follow:

Client/UI

    ↓

Application / Business Logic

    ↓

Database

Keep business logic on the server. Never rely on frontend validation alone for security-sensitive operations.

==================================================

3. CORE SYSTEM CONCEPT

==================================================

The Event should be the central object of the system.

Most event-related functions should be accessed through the selected Event instead of creating unnecessary standalone pages.

An Event may contain:

- Event information

- Registration

- Participant list

- QR attendance

- Attendance records

- Evaluation

- Certificate eligibility

- Certificates

- Event report

Avoid creating separate sidebar pages when the function naturally belongs to an Event.

==================================================

4. STUDENT SIDEBAR

==================================================

Keep the Student navigation simple:

- Dashboard

- Events

- My Events

- Evaluations

- Certificates

- Profile

- Logout

Do NOT create separate primary sidebar items for:

- My QR Codes

- Attendance

- Event Confirmation

- Event Details

These should be accessible inside My Events or the selected Event.

Example:

My Events

    ↓

Select Event

    ↓

Event Details

Inside the event:

- Event Information

- Registration Status

- My QR Code

- Attendance Status

- Evaluation

- Certificate Status

==================================================

5. STUDENT WORKFLOW

==================================================

Student registration/authentication:

Student

    ↓

Register or Login

    ↓

System validates account

    ↓

Student Dashboard

Event participation:

Student

    ↓

View Published Events

    ↓

Select Event

    ↓

View Event Details

    ↓

Register for Event

    ↓

System confirms registration

    ↓

QR Code becomes available

Event attendance:

Student

    ↓

Open registered event

    ↓

Present QR Code

    ↓

Organization Officer scans QR Code

    ↓

System validates QR Code

    ↓

Attendance is recorded

    ↓

Student can view attendance status

Post-event:

Student

    ↓

Submit Evaluation

    ↓

System checks certificate eligibility

    ↓

Qualified?

    ↓

Generate Certificate

    ↓

Student can view/access certificate

Do not create unnecessary separate pages for every step.

==================================================

6. ORGANIZATION OFFICER SIDEBAR

==================================================

Keep the Organization Officer navigation simple:

- Dashboard

- Events

- Evaluations

- Reports

- Profile

- Logout

The main Event page should contain event-specific management functions.

Organization Officer selects an event:

Event Management

    ├── Overview

    ├── Participants

    ├── QR Attendance

    ├── Evaluations

    ├── Certificates

    └── Report

==================================================

7. ORGANIZATION OFFICER WORKFLOW

==================================================

Event creation:

Organization Officer

    ↓

Create Event

    ↓

Enter Event Details

    ↓

Submit Event Request

    ↓

Admin Reviews Event

    ↓

Event Approved?

    ├── No → Rejected

    └── Yes → Publish Event

After approval:

Organization Officer

    ↓

Published Event

    ↓

Monitor Registrations

    ↓

Generate/enable QR attendance

    ↓

Scan participant QR codes

    ↓

System validates QR Code

    ↓

Attendance is recorded

After event:

Organization Officer

    ↓

Review Attendance

    ↓

Review Evaluations

    ↓

Check Certificate Eligibility

    ↓

Generate Certificates

    ↓

Generate Event Report

==================================================

8. ADMIN SIDEBAR

==================================================

Keep the Admin navigation simple:

- Dashboard

- Users

- Organizations

- Events

- Reports

- System Management

- Profile

- Logout

Admin functions:

User Management

- View users

- Update user information/status

- Manage account access

Organization Management

- View organizations

- Manage student organizations

Event Management

- View event requests

- Review event details

- Approve event

- Reject event

- Monitor published events

Reports

- Review system/event reports

System Management

- Maintain necessary system information/settings

Do not add unnecessary administrative modules.

==================================================

9. EVENT STATUS

==================================================

Use clear event states.

Possible states:

- Draft

- Pending Approval

- Approved

- Rejected

- Published

- Completed

Do not allow students to register for events that are not published.

==================================================

10. REGISTRATION

==================================================

When a student registers for an event:

1. Verify that the event is published.

2. Verify that the student is authenticated.

3. Check whether the student is already registered.

4. Check whether registration is still available.

5. Create the registration record.

6. Confirm registration.

7. Make the event QR code/attendance QR available to the student.

Prevent duplicate registrations.

==================================================

11. QR CODE ATTENDANCE

==================================================

QR code is used for event attendance.

The system must:

1. Associate the QR code with the appropriate event and registered student.

2. Allow the Organization Officer to scan/present the QR code during the event.

3. Validate the QR code.

4. Verify that the student is registered for the event.

5. Prevent invalid or duplicate attendance records.

6. Record the attendance.

7. Allow the student and Organization Officer to view the attendance status.

Do not treat QR Code and Attendance as the same data concept.

QR Code = identification/verification mechanism.

Attendance = record of the student's participation.

==================================================

12. EVALUATION

==================================================

Students who attended an event can submit an evaluation.

The system should:

- Allow evaluation only for eligible participants.

- Associate the evaluation with the student and event.

- Prevent duplicate evaluation submissions if required.

- Store evaluation results.

- Allow Organization Officers to review evaluation results.

==================================================

13. CERTIFICATES

==================================================

Certificate generation should depend on the defined eligibility conditions.

Example:

Registered

    +

Valid Attendance

    +

Required Evaluation

    ↓

Certificate Eligibility

    ↓

Generate Certificate

Certificates should be associated with:

- Student

- Event

- Certificate record

- Issue date

- Certificate status

The certificate should be accessible from the student's Certificates section and from the corresponding Event for the Organization Officer.

==================================================

14. NOTIFICATIONS

==================================================

The system may send notifications related to important event activities such as:

- Event approval

- Event publication

- Registration confirmation

- Event updates

- Certificate availability

Keep notifications focused on actual system requirements.

Do not build a complex real-time messaging system unless explicitly required.

==================================================

15. REPORTS

==================================================

Organization Officers should be able to generate reports related to their events.

Reports may include:

- Event information

- Number of registered participants

- Attendance

- Evaluation results

- Certificate issuance

Admin should be able to review appropriate system-level reports.

Do not add unnecessary analytics dashboards.

==================================================

16. DATABASE

==================================================

Design the database around the actual system requirements.

Initial entities may include:

- users

- organizations

- events

- event_registrations

- qr_codes

- attendance

- evaluations

- certificates

- notifications

- reports

However, do not blindly create tables. Review the relationships and normalize the database properly.

Important distinction:

Users

    ↓

Organizations

    ↓

Events

    ↓

Event Registrations

    ↓

QR Codes

    ↓

Attendance

    ↓

Evaluations

    ↓

Certificates

Use primary keys and foreign keys properly.

==================================================

17. ROLE-BASED ACCESS

==================================================

Students must only access Student functions.

Organization Officers must only access their organization's event management functions.

Admin has system-wide administrative access.

Every protected route must verify authorization on the server.

Never rely only on hiding UI elements.

==================================================

18. UI/UX REQUIREMENTS

==================================================

Design should be:

- Clean

- Professional

- Modern

- Responsive

- Easy to navigate

- Suitable for a university system

- Not overloaded with unnecessary cards or menu items

Use consistent:

- Typography

- Spacing

- Buttons

- Forms

- Tables

- Dialogs

- Status badges

- Navigation

The interface should prioritize usability over visual complexity.

Use tables for management-heavy data.

Use cards for summaries.

Use dialogs/modals for simple actions when appropriate.

==================================================

19. DASHBOARDS

==================================================

Student Dashboard:

Show only useful information such as:

- Upcoming events

- Registered events

- Attendance summary

- Available certificates

Organization Officer Dashboard:

Show:

- Total events

- Pending events

- Upcoming events

- Registered participants

- Attendance summary

Admin Dashboard:

Show:

- Total users

- Total organizations

- Pending event requests

- Published events

- System activity summary

Avoid excessive analytics.

==================================================

20. SECURITY

==================================================

Implement:

- Password hashing

- Secure authentication

- Role-based authorization

- Server-side validation

- Input validation

- Protection against unauthorized access

- Database constraints

- Secure file handling for certificates

- Proper session management

Never expose sensitive credentials.

==================================================

21. DEVELOPMENT APPROACH

==================================================

Build the system incrementally.

Phase 1:

- Project setup

- Database

- Authentication

- Role-based access

Phase 2:

- Student module

- Organization module

- Admin module

Phase 3:

- Event management

- Registration

- Event approval

Phase 4:

- QR code attendance

Phase 5:

- Evaluation

- Certificate generation

Phase 6:

- Notifications

- Reports

Phase 7:

- Testing

- Bug fixing

- UI refinement

- Deployment

==================================================

22. IMPORTANT DESIGN RULE

==================================================

Do not create a separate page simply because a function exists.

Ask:

"Does this function belong to an existing entity or workflow?"

For example:

QR Code belongs to Event Registration/Attendance.

Attendance belongs to the Event.

Evaluation belongs to the Event.

Certificate belongs to the Event and Student.

Therefore, these should generally be accessed through the selected Event rather than cluttering the sidebar.

==================================================

23. EXPECTED RESULT

==================================================

Build a complete, functional, responsive web-based system that follows the requirements above.

The final system should provide:

Student:

Discover events → Register → QR Code → Attendance → Evaluation → Certificate

Organization Officer:

Create event → Submit → Approval → Publish → Monitor registration → QR Attendance → Evaluation → Certificate → Report

Admin:

Manage users → Manage organizations → Approve events → Monitor events → Review reports → Maintain system

Keep the architecture simple, the navigation minimal, the database normalized, and the workflows consistent across the UI, backend, DFD, ERD, and Swimlane Diagram.

Before implementing a feature that is not explicitly mentioned above, explain why it is necessary and ask for approval instead of automatically adding it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/42feb5ae-2842-4a55-b2c9-4f2ba1ab77d0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
