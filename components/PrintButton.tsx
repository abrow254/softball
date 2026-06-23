'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md bg-field-grass px-4 py-2 font-medium text-white hover:bg-field-grass/90"
    >
      Print
    </button>
  )
}
