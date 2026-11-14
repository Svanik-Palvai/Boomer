import s from "./wordmark.module.css";

/** The first O wears the hat; the underlying word remains selectable text. */
export default function Wordmark() {
  return <span className={s.mark} aria-label="Boomer">B<span className={s.firstO}>O<svg aria-hidden="true" viewBox="0 0 100 55"><path d="M16 43V35C16 17 30 7 50 7s34 10 34 28v8" /><path d="M43 8V35M57 8V35M7 43H93V50H7Z" /></svg></span>OMER</span>;
}
