ALTER TABLE public.tenant ADD COLUMN lease_id UUID;

ALTER TABLE public.tenant
ADD CONSTRAINT tenant_lease_id_fkey
FOREIGN KEY (lease_id)
REFERENCES public.lease(id)
ON DELETE SET NULL;
