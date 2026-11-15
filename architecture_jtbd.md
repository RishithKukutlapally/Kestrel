# Kestrel Finance: First Slice, Jobs to Be Done and Architecture

## Summary

The first slice is a shared document checklist with reminders that a relationship manager approves before they go to the client. It targets repeated document requests (Opportunity 2), which is the highest-scoring option at ICE 7.3 and needs no hosted AI model to start. It runs in Kestrel's Azure India tenancy, makes no credit decision, and keeps a person signing every approval. Statement and GST extraction is slice two.

## Scope

In scope: simple applications under ₹25 lakh, one RM team, the credit analysts who receive their files, and the credit manager who signs. The slice covers the checklist of required documents, status tracking for each item, reminder drafts for RM review, and a visible view of what is blocking each file.

Out of scope: any credit decision, approval, or rejection; scorecard or policy changes; applications over ₹25 lakh; statement and GST extraction (slice two); writes to the loan origination system (LOS) in the first release; and any customer data outside the Azure India tenancy.

Baseline for the pilot: median 18 working days from application to decision, 22% of applicants withdrawing. Pilot measures: working days to decision against a matched comparison group, documents requested per case, days between requests, withdrawal rate, and the share of reminders approved without edits.

## Jobs to be done

### RM: get one complete request to the client

When a simple application is missing documents, the RM wants the full list sent to the client in one request, with a deadline, so the file is completed the first time and the client is not asked again.

Situation: RMs manage many active files, and each file can need several documents from the client. Motivation: avoid losing deals to repeated requests and to forgotten follow-ups. Outcome: every missing document is listed, sent once, and tracked to receipt, with no chase email written from memory.

### RM and sales lead: see what is outstanding and who owns it

When a client's file is waiting, the RM wants to see which documents are still missing, when each was requested, and whether the client or Kestrel owes the next step, so the RM stops reconstructing the status from email.

Outcome: a single status per file, with overdue items visible at the top of the queue.

### Credit operations coordinator: prioritise the queue

When the coordinator opens the queue, they want to see incomplete files by age and by blocker, so the chasing goes to the files that are holding up the most work.

Outcome: a queue sorted by the oldest outstanding item, with filters for RM and aging.

### Credit analyst: start on a complete file

When a file arrives at analysis, the analyst wants confidence that it is complete, and if it is not, a clear list of what is missing and why, so they do not return it by hand or wait for a request that nobody has sent.

Outcome: the analyst receives a file marked complete, or sees exactly which item is blocking it.

### Credit manager and CRO: oversee the process without approving automatically

The credit manager wants to see where files wait and confirm that every decision remains theirs. The CRO wants a record that no step has made a credit decision and that every client message was approved by a person.

Outcome: an audit trail of requests, reminder approvals, sends, receipts, and waivers, with no credit data on the operational screens.

### Corporate client: one clear list with a deadline

The client wants to receive everything needed in one message, with a clear deadline and the name of their RM.

Outcome: one reminder listing the specific documents, the due date, and the RM's name, approved before sending.

## Architecture

### Components

The checklist service applies rules to generate the required documents for each application, based on applicant type, product, and loan size. It keeps a versioned rule table that Credit owns, so the rules can be changed without a code release. Staff can add or waive items, and a waiver needs a recorded reason.

The document tracker stores the state of each item: requested, received, overdue, or waived. Overdue is derived from due dates set in configuration, which Operations confirms. This is the single shared record that RMs, the coordinator, and analysts all read.

The event log records every change as an immutable event: request created, reminder drafted, reminder approved, reminder sent, document received, item waived, file marked complete. The timeline, the queue ageing, and the pilot measures are all read from this log.

The reminder drafter fills a template with the outstanding items, the due date, and the RM's name. It produces a draft that is held until the RM approves it. Drafts are never sent automatically. Any model-assisted rewording is out of the first release, and if added later it must run in the Azure India tenancy with written approval from the CIO/CISO.

The approval and send step is the only route to the client. It checks that the draft has been approved by the named RM, sends through the existing mail system, and writes a send event to the log.

The queue and case views are the presentation layer. They read from the tracker and the event log, and enforce role-based access so that each user sees only their own portfolio, the coordinator sees the full queue, and the credit manager sees oversight data only.

### Data flow

An application is created in the LOS or CRM. The checklist service reads the application's product, applicant type, and loan size (read-only) and generates the required items. Missing items are detected and a reminder is drafted for the RM. The RM reviews, approves, and sends it through the mail system. When a document arrives in the document store, the tracker marks it received and writes an event. When all items are received, the file is marked complete and the analyst's queue is updated. The LOS is not written to in this release; the completion flag is shown in the slice's own view.

### Integrations

Four integrations are needed, all to be confirmed with the platform owners. Read access to the LOS or CRM for application, product, applicant type, and loan size. Read access to the document store for document metadata and receipt confirmation. The existing mail system to send approved reminders. Identity and single sign-on for the RM, coordinator, analyst, and manager roles.

### Hosting and data controls

The slice runs entirely inside Kestrel's Azure India tenancy, on a private network with no public endpoints. Customer data does not go to any public AI service. The tracker database, the event log, and the reminder drafts are stored in the tenancy with the retention period agreed with Compliance. Access to the audit log is restricted and read-only for the CRO's team. The prototype uses synthetic data only, with fictional client names and case IDs in the format KF-2026-XXXX.

### Controls

Every state-changing action records the actor, the timestamp, and the reason. Drafts cannot be sent without RM approval; this is enforced on the server, not only in the interface. Waivers require a reason. Credit memo content is excluded from every data path in this slice, not merely hidden. Role-based access is checked on every API call.

### One-way doors

A reminder sent to a client cannot be recalled, so the approval step is permanent. Writing status back to the LOS would change the system of record, so the slice starts read-only with respect to the LOS. Automated approval or rejection of any credit is excluded. Deleting the audit trail is excluded. Templates, the checklist rule order, and the reminder wording are two-way doors and can be changed freely.

## Open decisions

The overdue thresholds need confirmation from Operations. The document list for each product needs agreement with Credit. The LOS and document-store interfaces need confirmation from the platform owners. The retention period for the event log needs Compliance's decision. The name of the owner for the reminder template wording, typically Operations or Compliance, needs to be recorded before the pilot.

## Pilot success measures

Working days to decision for the pilot cohort against a matched comparison group, measured from the event log. Documents requested per case, and the days between requests. Withdrawal rate before decision. Share of reminders approved without edits. Analyst time to start analysis on a complete file, compared with the baseline sample of 30 to 50 applications taken in week one.