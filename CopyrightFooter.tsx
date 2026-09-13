// Structural enforcement of the "Cratto Ctrl" footer requirement: every
// page imports this component instead of the string being retyped (and
// potentially forgotten) per file.
export function CopyrightFooter() {
  return <p className="active-footer">Cratto Ctrl</p>;
}
