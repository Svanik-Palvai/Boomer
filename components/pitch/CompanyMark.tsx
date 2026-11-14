"use client";
// OWNER: Pitch presentation. Official company artwork with a readable failure state.
import { useState } from "react";
import type { Company } from "./content";
import s from "./pitch.module.css";
export default function CompanyMark({
  company,
  duplicate = false,
}: {
  company: Company;
  duplicate?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <a
      tabIndex={duplicate ? -1 : undefined}
      href={company.url}
      target="_blank"
      rel="noreferrer"
      className={s.company}
    >
      <span className={s.companyImage}>
        {company.logo && !failed ? (
          <img
            src={`/pitch/${company.logo}`}
            alt={company.name}
            width="170"
            height="64"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <b>{company.name}</b>
        )}
      </span>
      <small>{company.area}</small>
    </a>
  );
}
