CREATE OR REPLACE FUNCTION public.generate_ticket()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_ticket TEXT;
  already_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ticket in format: BT-XXXXXX
    new_ticket := 'BT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

    -- Check if ticket already exists (avoid ambiguous column name)
    SELECT EXISTS(
      SELECT 1
      FROM public.complaints c
      WHERE c.ticket = new_ticket
    ) INTO already_exists;

    -- If ticket doesn't exist, return it
    IF NOT already_exists THEN
      RETURN new_ticket;
    END IF;
  END LOOP;
END;
$function$;