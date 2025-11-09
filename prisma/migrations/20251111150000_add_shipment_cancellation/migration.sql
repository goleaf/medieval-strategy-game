-- Add cancellation tracking to shipments so we can refund resources when trades are recalled.
ALTER TABLE "Shipment"
ADD COLUMN "cancelledAt" DATETIME;
