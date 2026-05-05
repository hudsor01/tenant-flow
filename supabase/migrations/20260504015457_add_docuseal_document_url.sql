-- F-8: Persist signed PDF URL from DocuSeal completed submissions.
-- The docuseal-webhook submission.completed handler currently logs the URL only
-- because no column existed to store it. This migration adds that column so the
-- webhook can persist a long-lived audit reference to the signed document.
ALTER TABLE public.leases
    ADD COLUMN IF NOT EXISTS docuseal_document_url text;

COMMENT ON COLUMN public.leases.docuseal_document_url IS
    'Signed PDF URL returned by DocuSeal in the submission.completed webhook payload. Long-lived audit reference; nullable before any signing has occurred.';
