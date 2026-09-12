/**
 * A tiny credit card: terracotta body, gold chip, one stripe. Drawn with
 * boxes rather than text so it survives Satori's limited font support and
 * stays legible when the browser shrinks the favicon to 16px.
 */
export function BrandMark({ rounded }: { rounded: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#fbf5ec",
        borderRadius: rounded ? "22%" : 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "10%",
          top: "22%",
          width: "80%",
          height: "56%",
          borderRadius: "12%",
          background: "linear-gradient(135deg, #bf5b3f 0%, #a2492f 100%)",
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: "26%",
            width: "24%",
            height: "30%",
            borderRadius: "18%",
            background: "#fde68a",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "12%",
            bottom: "16%",
            width: "50%",
            height: "12%",
            borderRadius: "999px",
            background: "rgba(251,245,236,0.8)",
          }}
        />
      </div>
    </div>
  );
}
