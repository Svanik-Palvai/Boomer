import s from "./wordmark.module.css";

/**
 * BOOMER with a hard hat seated on the first O, matching the brand mark.
 * Letters use currentColor; set --hat and --hat-gap (the background colour) on a parent to restyle the hat.
 * The word stays real, selectable text.
 */
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`${s.mark} ${className ?? ""}`} aria-label="Boomer">
      B
      <span className={s.firstO}>
        O
        <svg aria-hidden="true" viewBox="0 0 120 64" className={s.hat}>
          <path className={s.dome} d="M15 55C15 26 33 9 60 9s45 17 45 46Z" />
          <path className={s.ridge} d="M50 11.5C50 6.5 54 4 60 4s10 2.5 10 7.5V55H50Z" />
          <path className={s.brim} d="M3 55.5Q60 45 117 55.5Q119.5 56 119.5 58.5V59.5Q119.5 62 117 61.6Q60 52.5 3 61.6Q.5 62 .5 59.5V58.5Q.5 56 3 55.5Z" />
        </svg>
      </span>
      OMER
    </span>
  );
}
