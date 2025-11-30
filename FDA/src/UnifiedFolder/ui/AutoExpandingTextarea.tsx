import * as React from "react";
import { cn } from "./utils";

interface AutoExpandingTextareaProps extends React.ComponentProps<"textarea"> {}

const AutoExpandingTextarea = React.forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Combine the forwarded ref with our internal ref
    const combinedRef = React.useCallback(
      (element: HTMLTextAreaElement | null) => {
        // Update the forwarded ref
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
        
        // Update our internal ref
        textareaRef.current = element;
        
        // Auto-expand on mount
        if (element) {
          autoExpand(element);
        }
      },
      [ref]
    );

    const autoExpand = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      autoExpand(e.target);
      if (onChange) {
        onChange(e);
      }
    };

    // Auto-expand when value changes (for initial load and external updates)
    React.useEffect(() => {
      if (textareaRef.current) {
        autoExpand(textareaRef.current);
      }
    }, [value]);

    return (
      <textarea
        ref={combinedRef}
        data-slot="textarea"
        className={cn(
          // Remove resize-none and add overflow-hidden to prevent scrollbars
          "overflow-hidden border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

AutoExpandingTextarea.displayName = "AutoExpandingTextarea";

export { AutoExpandingTextarea };