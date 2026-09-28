// The AI student's mark beside its messages.
//
// This replaces a gradient square with a graduation cap on it. The cap was
// doing two unhelpful things: implying the AI is the teacher, when the whole
// premise is that it is the confused one, and drawing more attention than the
// person's own messages, which carry no avatar at all.
//
// A quiet initial in a neutral circle says "someone else is speaking" and
// then gets out of the way.
const SIZES = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-12 h-12 text-base',
}

const StudentAvatar = ({ size = 'md', className = '' }) => (
  <div
    // Labelled rather than decorative: without this a screen reader reads a
    // bare "S" in the middle of the conversation.
    role="img"
    aria-label="AI student"
    title="AI student"
    className={`${SIZES[size] ?? SIZES.md} rounded-full bg-surface-2 border border-line
                text-muted font-semibold flex items-center justify-center
                flex-shrink-0 select-none ${className}`}
  >
    S
  </div>
)

export default StudentAvatar
