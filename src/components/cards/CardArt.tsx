import type { CreditCard } from "@/generated/prisma";

/** A little credit-card shaped block in the card's color. */
export function CardArt({
  card,
  size = "md",
}: {
  card: Pick<CreditCard, "name" | "issuer" | "lastFour" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "h-9 w-14 rounded-md text-[7px]"
      : size === "lg"
        ? "h-36 w-56 rounded-2xl text-sm"
        : "h-20 w-32 rounded-xl text-[9px]";
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${dims} text-white shadow-md`}
      style={{
        background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 60%, #00000055 100%)`,
      }}
      aria-hidden
    >
      <span className="absolute left-[8%] top-[10%] block h-[18%] w-[16%] rounded-[3px] bg-amber-200/80" />
      {size !== "sm" && (
        <>
          <span className="absolute left-[8%] bottom-[24%] block font-medium tracking-[0.2em] opacity-90">
            •••• {card.lastFour ?? "••••"}
          </span>
          <span className="absolute left-[8%] bottom-[8%] block truncate pr-2 font-heading opacity-90">
            {card.name}
          </span>
        </>
      )}
    </div>
  );
}
