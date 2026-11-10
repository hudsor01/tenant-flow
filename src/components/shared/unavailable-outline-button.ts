/**
 * The classes an outline Button takes while it is unavailable through
 * `aria-disabled` (66.2-39 fix round 4, G15): the reports' exports keep their
 * tab stop so the reason they are off stays reachable (OD-12), which leaves
 * pointer events on, so the outline variant's hover still painted on them: an
 * off Download PDF turned emerald under the pointer in light (`hover:bg-accent`
 * with `hover:text-accent-foreground`) and brightened to `input/50` in dark.
 *
 * Beside the not-allowed cursor and the half opacity, these restate the
 * resting fill and label under the pointer: `bg-background` in light,
 * `bg-input/30` in dark (later in the compiled CSS, so it wins there), and
 * the inherited label. Each beats the variant's hover by one attribute of
 * specificity. `button-caller-states.test.ts` measures every `aria-disabled`
 * Button site's hover against its rest in both themes.
 */
export const UNAVAILABLE_OUTLINE_BUTTON_CLASSES =
	"aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background aria-disabled:hover:text-inherit dark:aria-disabled:hover:bg-input/30";
