// OWNER: Teammate 4 (AR). Screen 5: AR guide.
export default function GuidePage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>AR guide</h1>
      <p>
        TODO(T4): live camera (getUserMedia), overlays from data/arSteps.json for the plan&apos;s
        new_here steps only, Next button. Case {params.id}.
      </p>
    </main>
  );
}
