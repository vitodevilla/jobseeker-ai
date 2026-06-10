import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormActionsProps = {
  cancelHref: string;
  submitLabel: string;
  className?: string;
};

export function FormActions({
  cancelHref,
  submitLabel,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-end",
        className,
      )}
    >
      <Button variant="outline" className="w-full sm:w-auto" asChild>
        <Link href={cancelHref}>Cancel</Link>
      </Button>
      <Button type="submit" className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </div>
  );
}
