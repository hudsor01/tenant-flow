// Per-claim checker for the 66.2 wave 5 gate (66.2-29). Read-only: it reads component-probe and
// render-check JSON, the vitest JSON report and log, the 66.2-22 button icon census, files at HEAD
// (from disk) and at a pre-wave revision (`git show <sha>:<path>`), and writes only --out.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/w5-claims.mjs --probes <json> --tokens <tokens json>
//     --unit-report <json> --unit-log <file> --census <json> --pre <sha> --out <file>
//     [--probe-only] [--expect-fail <id,id>]
//   node .planning/tailwind-shadcn/audit/w5-claims.mjs --self-test
//
// Output: { mode, claims: [{ id, pass, checks: [{ name, pass, expected, measured }] }],
//   vdCoverage: { "VD-14": bool, ... }, failed }. Exit 1 when failed > 0; under --expect-fail,
//   exit 0 only when exactly the listed claims fail.
//
// Probe checks run in both themes (light, dark) and compare each probe color with the
// render-check token of the same theme (tokens file: { light: { <name>: [r,g,b,a] }, dark }).
// Tolerances: alpha within 0.02 unless a range is stated; RGB per channel within
// tolRgb(a) = max(3, ceil(0.5 / a) + 1), a = the measured alpha of the probe color. The canvas
// helper reads colors back through a 1px canvas, which stores 8-bit premultiplied values, so
// un-premultiplying at alpha a carries up to 0.5 / a of rounding error per channel. That is a
// fixed function of the measurement (3 for every a >= 0.25, 6 near a = 0.1), never a widened
// tolerance.
//
// --probe-only runs only the probe checks (no source, unit, census or git checks); a claim with
// no probe check reports pass with no checks. A probe check whose id or field is absent fails
// with measured "missing".
//
// Source checks that look for a forbidden token read non-comment lines only (lines whose trimmed
// text does not start with //, /* or *), because the wave 5 header comments name what they
// removed.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const THEMES = ["light", "dark"];

const PROBE_IDS = {
	otpSetup: "otp-setup",
	otpMfa: "otp-mfa",
	chart: "chart",
	command: "command",
	datePopover: "date-popover",
	plainPopover: "plain-popover",
	gridPattern: "grid-pattern",
	beamStats: "border-beam-stats",
	beamGrid: "border-beam-grid",
	beamReducedMotion: "border-beam-reduced-motion",
	blurNoJs: "blur-fade-no-js",
	blurReducedMotion: "blur-fade-reduced-motion",
	blurIoStub: "blur-fade-io-stub",
	passwordBadge: "update-password-badge",
	dataTable: "data-table",
	sheet: "sheet",
	sheetNoClose: "sheet-no-close",
	sheetSlotOverride: "sheet-slot-override",
	button: "button",
	toastDefault: "toast-default",
	toastSuccess: "toast-success",
	toastError: "toast-error",
	toastLoading: "toast-loading",
};

const CLAIM_IDS = [
	"C1",
	"C2",
	"C3",
	"C4",
	"C5",
	"C6",
	"C7",
	"C8",
	"C9",
	"C10",
	"C11",
	"C12a",
	"C12b",
	"C12c",
	"C13",
	"C14",
	"C15",
	"C16",
	"N1",
	"N2",
	"N3",
	"SHEET",
	"D-04",
	"D-26",
];

const VD_MAP = {
	"VD-14": "C1",
	"VD-15": "C7",
	"VD-16": "C2",
	"VD-17": "C2",
	"VD-18": "C3",
	"VD-19": "C9",
	"VD-20": "C9",
	"VD-21": "C12b",
	"VD-22": "C12a",
	"VD-23": "C12c",
	"VD-24": "C4",
	"VD-25": "C4",
	"VD-30": "N1",
};

const MISSING = "missing";
const ALPHA_TOL = 0.02;

// ---------- helpers ----------

function tolRgb(a) {
	return Math.max(3, Math.ceil(0.5 / a) + 1);
}

function isColor(v) {
	return Array.isArray(v) && v.length === 4 && v.every((x) => typeof x === "number");
}

function rgbWithin(m, r) {
	if (!isColor(m) || !isColor(r)) return false;
	const tol = tolRgb(m[3]);
	return [0, 1, 2].every((i) => Math.abs(m[i] - r[i]) <= tol);
}

function colorWithin(m, r) {
	return rgbWithin(m, r) && Math.abs(m[3] - r[3]) <= ALPHA_TOL;
}

function sameColor(m, r) {
	return isColor(m) && isColor(r) && m.every((x, i) => x === r[i]);
}

function alphaIs(m, a) {
	return isColor(m) && Math.abs(m[3] - a) <= ALPHA_TOL;
}

function alphaIn(m, lo, hi) {
	return isColor(m) && m[3] >= lo && m[3] <= hi;
}

function pathGet(obj, path) {
	let cur = obj;
	for (const k of path.split(".")) {
		if (cur === null || cur === undefined || typeof cur !== "object" || !(k in cur)) return MISSING;
		cur = cur[k];
	}
	return cur;
}

function createCollector() {
	const checks = [];
	return {
		checks,
		add(name, pass, expected, measured) {
			checks.push({ name, pass: Boolean(pass), expected, measured });
		},
	};
}

// A probe check: reads each field path from the probe result of one theme. Any MISSING field
// fails the check with measured "missing".
function probeCheck(c, probes, id, theme, name, fields, predicate, expected) {
	const result = probes?.results?.[id]?.[theme];
	if (result === undefined || result === null) {
		c.add(`${theme} ${id}: ${name}`, false, expected, MISSING);
		return;
	}
	const values = fields.map((f) => pathGet(result, f));
	if (values.some((v) => v === MISSING)) {
		c.add(`${theme} ${id}: ${name}`, false, expected, MISSING);
		return;
	}
	let pass = false;
	try {
		pass = predicate(...values);
	} catch {
		pass = false;
	}
	c.add(`${theme} ${id}: ${name}`, pass, expected, values.length === 1 ? values[0] : values);
}

function isCommentLine(line) {
	const t = line.trim();
	return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

function codeLines(text) {
	return text
		.split("\n")
		.filter((l) => !isCommentLine(l))
		.join("\n");
}

function readHead(rel) {
	const p = join(ROOT, rel);
	return existsSync(p) ? readFileSync(p, "utf8") : null;
}

function readAt(sha, rel) {
	try {
		return execFileSync("git", ["show", `${sha}:${rel}`], {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

function rg(args) {
	try {
		return execFileSync("rg", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
			.split("\n")
			.filter(Boolean);
	} catch (err) {
		if (err.status === 1) return [];
		throw err;
	}
}

function countOf(text, needle) {
	if (text === null) return 0;
	let n = 0;
	let i = text.indexOf(needle);
	while (i !== -1) {
		n++;
		i = text.indexOf(needle, i + needle.length);
	}
	return n;
}

function regexCount(text, re) {
	if (text === null) return 0;
	return (text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []).length;
}

const UI = "src/components/ui";

// ---------- probe checks per claim ----------

function shadowHas(s, px) {
	return typeof s === "string" && new RegExp(`(^|[^\\d.])0px 0px 0px ${px}px(?![\\d.])`).test(s);
}

const PROBE_CHECKS = {
	C1(c, p) {
		for (const theme of THEMES) {
			for (const id of [PROBE_IDS.otpSetup, PROBE_IDS.otpMfa]) {
				probeCheck(c, p, id, theme, "slotCount 6", ["slotCount"], (v) => v === 6, 6);
				probeCheck(c, p, id, theme, "dataSlotCount 10", ["dataSlotCount"], (v) => v === 10, 10);
				probeCheck(
					c,
					p,
					id,
					theme,
					"every slot 44x56, 20px, 1px borders, 8px radii",
					["slots"],
					(slots) =>
						Array.isArray(slots) &&
						slots.length === 6 &&
						slots.every(
							(s) =>
								s.width === 44 &&
								s.height === 56 &&
								s.fontSize === "20px" &&
								Array.isArray(s.borderWidths) &&
								s.borderWidths.length === 4 &&
								s.borderWidths.every((w) => w === 1) &&
								Array.isArray(s.radii) &&
								s.radii.length === 4 &&
								s.radii.every((r) => r === 8),
						),
					{ width: 44, height: 56, fontSize: "20px", borderWidths: [1, 1, 1, 1], radii: [8, 8, 8, 8] },
				);
			}
		}
	},
	C2(c, p) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.chart;
			probeCheck(
				c,
				p,
				id,
				theme,
				"gridStroke rgb within tolRgb of borderToken",
				["gridStroke", "borderToken"],
				(g, b) => rgbWithin(g, b),
				"rgb of borderToken",
			);
			probeCheck(c, p, id, theme, "gridStroke alpha in [0.48, 0.52]", ["gridStroke"], (g) => alphaIn(g, 0.48, 0.52), [0.48, 0.52]);
			probeCheck(c, p, id, theme, "activeDotStroke alpha 0", ["activeDotStroke"], (d) => alphaIs(d, 0), 0);
		}
		const l = pathGet(p?.results?.[PROBE_IDS.chart] ?? {}, "light.gridStroke");
		const d = pathGet(p?.results?.[PROBE_IDS.chart] ?? {}, "dark.gridStroke");
		c.add(
			"chart: light gridStroke differs from dark",
			l !== MISSING && d !== MISSING && isColor(l) && isColor(d) && !sameColor(l, d),
			"light != dark",
			l === MISSING || d === MISSING ? MISSING : [l, d],
		);
	},
	C3(c, p) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.command;
			probeCheck(c, p, id, theme, "wrapperHeight 48", ["wrapperHeight"], (v) => v === 48, 48);
			probeCheck(c, p, id, theme, "inputHeight 48", ["inputHeight"], (v) => v === 48, 48);
			probeCheck(c, p, id, theme, "inputOverflowsWrapper false", ["inputOverflowsWrapper"], (v) => v === false, false);
			probeCheck(
				c,
				p,
				id,
				theme,
				"inputOverflowPx <= wrapperBorderBottomPx",
				["inputOverflowPx", "wrapperBorderBottomPx"],
				(o, b) => typeof o === "number" && typeof b === "number" && o <= b,
				"<= wrapperBorderBottomPx",
			);
		}
	},
	C4(c, p, T) {
		for (const theme of THEMES) {
			const t = T[theme] ?? {};
			const d = PROBE_IDS.toastDefault;
			probeCheck(c, p, d, theme, "toastBg equals popoverToken", ["toastBg", "popoverToken"], sameColor, "popoverToken");
			probeCheck(c, p, d, theme, "toastColor equals popoverFgToken", ["toastColor", "popoverFgToken"], sameColor, "popoverFgToken");
			probeCheck(c, p, d, theme, "toastBorderColor equals borderToken", ["toastBorderColor", "borderToken"], sameColor, "borderToken");
			probeCheck(c, p, d, theme, "toastBg within tolerance of T.popover", ["toastBg"], (v) => colorWithin(v, t.popover), t.popover);
			probeCheck(
				c,
				p,
				d,
				theme,
				"toastColor within tolerance of T.popover-foreground",
				["toastColor"],
				(v) => colorWithin(v, t["popover-foreground"]),
				t["popover-foreground"],
			);
			probeCheck(c, p, d, theme, "toastBorderColor within tolerance of T.border", ["toastBorderColor"], (v) => colorWithin(v, t.border), t.border);
			probeCheck(c, p, d, theme, "toastRadius 8px", ["toastRadius"], (v) => v === "8px", "8px");
			probeCheck(c, p, d, theme, "toasterInlineNormalBg empty", ["toasterInlineNormalBg"], (v) => v === "", "");
			probeCheck(
				c,
				p,
				d,
				theme,
				"toasterClass has no toaster or group token",
				["toasterClass"],
				(v) => typeof v === "string" && !v.split(/\s+/).some((tok) => tok === "toaster" || tok === "group"),
				"no toaster/group token",
			);
			for (const [id, glyph] of [
				[PROBE_IDS.toastSuccess, "lucide-circle-check"],
				[PROBE_IDS.toastError, "lucide-octagon-x"],
			]) {
				probeCheck(
					c,
					p,
					id,
					theme,
					"toastBg differs from popoverToken by more than 3 in some channel (richColors)",
					["toastBg", "popoverToken"],
					(bg, pop) => isColor(bg) && isColor(pop) && [0, 1, 2].some((i) => Math.abs(bg[i] - pop[i]) > 3),
					"> 3 in some channel",
				);
				probeCheck(c, p, id, theme, "iconWidth 16", ["iconWidth"], (v) => v === 16, 16);
				probeCheck(c, p, id, theme, `iconClasses contains ${glyph}`, ["iconClasses"], (v) => Array.isArray(v) && v.includes(glyph), glyph);
			}
			probeCheck(
				c,
				p,
				PROBE_IDS.toastLoading,
				theme,
				"iconClasses contains animate-spin",
				["iconClasses"],
				(v) => Array.isArray(v) && v.includes("animate-spin"),
				"animate-spin",
			);
		}
	},
	C7(c, p, T) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.datePopover;
			const t = T[theme] ?? {};
			probeCheck(c, p, id, theme, "popoverContentDataSlotCount 1", ["popoverContentDataSlotCount"], (v) => v === 1, 1);
			probeCheck(c, p, id, theme, "calendarBg alpha 0", ["calendarBg"], (v) => alphaIs(v, 0), 0);
			probeCheck(c, p, id, theme, "popoverBg within tolerance of T.popover", ["popoverBg"], (v) => colorWithin(v, t.popover), t.popover);
			probeCheck(
				c,
				p,
				id,
				theme,
				"cornerPatchMaxDiffVsPlain <= 2",
				["cornerPatchMaxDiffVsPlain"],
				(v) => typeof v === "number" && v <= 2,
				"<= 2",
			);
		}
	},
	C9(c, p, T) {
		const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"];
		for (const theme of THEMES) {
			const id = PROBE_IDS.button;
			const t = T[theme] ?? {};
			for (const v of VARIANTS) {
				const b = `variants.${v}`;
				probeCheck(c, p, id, theme, `${v} dataSlot button`, [`${b}.dataSlot`], (x) => x === "button", "button");
				probeCheck(c, p, id, theme, `${v} dataVariant ${v}`, [`${b}.dataVariant`], (x) => x === v, v);
				probeCheck(c, p, id, theme, `${v} dataSize default`, [`${b}.dataSize`], (x) => x === "default", "default");
				probeCheck(c, p, id, theme, `${v} height 44`, [`${b}.height`], (x) => x === 44, 44);
				probeCheck(c, p, id, theme, `${v} flexShrink 0`, [`${b}.flexShrink`], (x) => x === "0", "0");
				probeCheck(c, p, id, theme, `${v} focus.focusVisible true`, [`${b}.focus.focusVisible`], (x) => x === true, true);
				probeCheck(c, p, id, theme, `${v} focus.outlineStyle none`, [`${b}.focus.outlineStyle`], (x) => x === "none", "none");
				probeCheck(
					c,
					p,
					id,
					theme,
					`${v} focus.boxShadow has the 3px ring and no 2px or 4px ring`,
					[`${b}.focus.boxShadow`],
					(s) => shadowHas(s, 3) && !shadowHas(s, 2) && !shadowHas(s, 4),
					"0px 0px 0px 3px, not 2px/4px",
				);
			}
			probeCheck(
				c,
				p,
				id,
				theme,
				"outline focus.borderColor equals refs.ring",
				["variants.outline.focus.borderColor", "refs.ring"],
				sameColor,
				"refs.ring",
			);
			probeCheck(c, p, id, theme, "default bg within tolerance of T.primary", ["variants.default.bg"], (x) => colorWithin(x, t.primary), t.primary);
			probeCheck(c, p, id, theme, "secondary bg within tolerance of T.secondary", ["variants.secondary.bg"], (x) => colorWithin(x, t.secondary), t.secondary);
			probeCheck(c, p, id, theme, "ghost bg alpha 0", ["variants.ghost.bg"], (x) => alphaIs(x, 0), 0);
			probeCheck(c, p, id, theme, "link bg alpha 0", ["variants.link.bg"], (x) => alphaIs(x, 0), 0);
			if (theme === "light") {
				probeCheck(c, p, id, theme, "outline borderColor equals refs.border", ["variants.outline.borderColor", "refs.border"], sameColor, "refs.border");
				probeCheck(
					c,
					p,
					id,
					theme,
					"outline boxShadowRest has shadow-xs (0px 1px 2px 0px)",
					["variants.outline.boxShadowRest"],
					(s) => typeof s === "string" && /(^|[^\d.])0px 1px 2px 0px(?![\d.])/.test(s),
					"0px 1px 2px 0px",
				);
			} else {
				probeCheck(c, p, id, theme, "outline bg alpha in (0, 1)", ["variants.outline.bg"], (x) => isColor(x) && x[3] > 0 && x[3] < 1, "(0, 1)");
				probeCheck(c, p, id, theme, "destructive bg alpha in [0.55, 0.65]", ["variants.destructive.bg"], (x) => alphaIn(x, 0.55, 0.65), [0.55, 0.65]);
			}
			probeCheck(c, p, id, theme, "invalid.borderColor equals refs.destructive", ["invalid.borderColor", "refs.destructive"], sameColor, "refs.destructive");
			probeCheck(c, p, id, theme, "sizes.sm.height 44", ["sizes.sm.height"], (x) => x === 44, 44);
			probeCheck(c, p, id, theme, "sizes.lg.height 44", ["sizes.lg.height"], (x) => x === 44, 44);
			probeCheck(c, p, id, theme, "sizes.icon 44x44", ["sizes.icon.height", "sizes.icon.width"], (h, w) => h === 44 && w === 44, [44, 44]);
			probeCheck(c, p, id, theme, "asChild tag A", ["asChild.tag"], (x) => x === "A", "A");
			probeCheck(c, p, id, theme, "asChild dataSlot button", ["asChild.dataSlot"], (x) => x === "button", "button");
			probeCheck(c, p, id, theme, "asChild buttonCount 0", ["asChild.buttonCount"], (x) => x === 0, 0);
			probeCheck(c, p, id, theme, "icons.unsized [16,16]", ["icons.unsized"], (x) => Array.isArray(x) && x[0] === 16 && x[1] === 16, [16, 16]);
			probeCheck(c, p, id, theme, "icons.size5 [20,20]", ["icons.size5"], (x) => Array.isArray(x) && x[0] === 20 && x[1] === 20, [20, 20]);
		}
	},
	C12a(c, p, T) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.gridPattern;
			const t = T[theme] ?? {};
			probeCheck(c, p, id, theme, "svgStroke is not none", ["svgStroke"], (v) => typeof v === "string" && v !== "none", "not none");
			probeCheck(c, p, id, theme, "svgStrokeRgba rgb within tolerance of T.foreground", ["svgStrokeRgba"], (v) => rgbWithin(v, t.foreground), t.foreground);
			probeCheck(c, p, id, theme, "svgStrokeRgba alpha in [0.23, 0.27]", ["svgStrokeRgba"], (v) => alphaIn(v, 0.23, 0.27), [0.23, 0.27]);
		}
	},
	C12b(c, p) {
		for (const theme of THEMES) {
			for (const id of [PROBE_IDS.beamStats, PROBE_IDS.beamGrid]) {
				probeCheck(c, p, id, theme, "afterAnimationName border-beam", ["afterAnimationName"], (v) => v === "border-beam", "border-beam");
				probeCheck(
					c,
					p,
					id,
					theme,
					"afterAnimationDuration equals <props.duration>s",
					["afterAnimationDuration", "props.duration"],
					(v, dur) => v === `${dur}s`,
					"<props.duration>s",
				);
				probeCheck(c, p, id, theme, "runningAnimations >= 1", ["runningAnimations"], (v) => typeof v === "number" && v >= 1, ">= 1");
				probeCheck(c, p, id, theme, "afterBackgroundImage not none", ["afterBackgroundImage"], (v) => typeof v === "string" && v !== "none", "not none");
			}
		}
	},
	C12c(c, p) {
		for (const theme of THEMES) {
			for (const id of [PROBE_IDS.blurNoJs, PROBE_IDS.blurReducedMotion, PROBE_IDS.blurIoStub]) {
				probeCheck(c, p, id, theme, "ssrHtmlHasOpacity0 false", ["ssrHtmlHasOpacity0"], (v) => v === false, false);
				probeCheck(c, p, id, theme, "ssrAriaHidden null", ["ssrAriaHidden"], (v) => v === null, null);
				probeCheck(c, p, id, theme, "opacityAtEnd 1", ["opacityAtEnd"], (v) => v === 1, 1);
				probeCheck(c, p, id, theme, "ariaHiddenAtEnd null", ["ariaHiddenAtEnd"], (v) => v === null, null);
				probeCheck(c, p, id, theme, "dataSlot blur-fade", ["dataSlot"], (v) => v === "blur-fade", "blur-fade");
			}
			probeCheck(c, p, PROBE_IDS.blurReducedMotion, theme, "opacityAtStart 1", ["opacityAtStart"], (v) => v === 1, 1);
			probeCheck(c, p, PROBE_IDS.blurIoStub, theme, "ioConstructions 0", ["ioConstructions"], (v) => v === 0, 0);
		}
	},
	N1(c, p, T) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.passwordBadge;
			const t = T[theme] ?? {};
			probeCheck(
				c,
				p,
				id,
				theme,
				"classes contains bg-primary/10 (input echo)",
				["classes"],
				(v) => typeof v === "string" && v.split(/\s+/).includes("bg-primary/10"),
				"bg-primary/10",
			);
			probeCheck(c, p, id, theme, "bg rgb within tolRgb(bg[3]) of T.primary", ["bg"], (v) => rgbWithin(v, t.primary), t.primary);
			probeCheck(c, p, id, theme, "bg alpha in [0.08, 0.12]", ["bg"], (v) => alphaIn(v, 0.08, 0.12), [0.08, 0.12]);
		}
	},
	N2(c, p) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.dataTable;
			probeCheck(c, p, id, theme, "cellBg alpha 0", ["cellBg"], (v) => alphaIs(v, 0), 0);
			probeCheck(c, p, id, theme, "headerCellBg alpha 0", ["headerCellBg"], (v) => alphaIs(v, 0), 0);
			probeCheck(c, p, id, theme, "hoverRowBg alpha > 0", ["hoverRowBg"], (v) => isColor(v) && v[3] > 0, "> 0");
			probeCheck(c, p, id, theme, "selectedRowBg alpha > 0", ["selectedRowBg"], (v) => isColor(v) && v[3] > 0, "> 0");
		}
	},
	SHEET(c, p) {
		for (const theme of THEMES) {
			const id = PROBE_IDS.sheet;
			probeCheck(c, p, id, theme, "contentDataSlot sheet-content", ["contentDataSlot"], (v) => v === "sheet-content", "sheet-content");
			probeCheck(c, p, id, theme, "closeButtonCount 1", ["closeButtonCount"], (v) => v === 1, 1);
			probeCheck(c, p, id, theme, "close 44x44", ["closeWidth", "closeHeight"], (w, h) => w === 44 && h === 44, [44, 44]);
			probeCheck(c, p, id, theme, "closeAriaLabel Close", ["closeAriaLabel"], (v) => v === "Close", "Close");
			probeCheck(c, p, id, theme, "closeSrOnlyTextCount 0", ["closeSrOnlyTextCount"], (v) => v === 0, 0);
			probeCheck(c, p, PROBE_IDS.sheetNoClose, theme, "closeButtonCount 0", ["closeButtonCount"], (v) => v === 0, 0);
			probeCheck(c, p, PROBE_IDS.sheetSlotOverride, theme, "contentDataSlot sidebar", ["contentDataSlot"], (v) => v === "sidebar", "sidebar");
		}
	},
};

// ---------- source / unit / census checks per claim ----------

function unitPassed(report, rel) {
	const files = report?.testResults ?? [];
	const hit = files.find((f) => typeof f.name === "string" && (f.name === rel || f.name.endsWith(`/${rel}`)));
	if (!hit) return { pass: false, measured: "absent from unit report" };
	return { pass: hit.status === "passed", measured: hit.status };
}

function contains(c, rel, needle, label) {
	const text = readHead(rel);
	c.add(label ?? `${rel} contains ${needle}`, text !== null && text.includes(needle), needle, text === null ? "file absent" : countOf(text, needle));
}

function lacksInCode(c, rel, needle, label) {
	const text = readHead(rel);
	const n = text === null ? null : countOf(codeLines(text), needle);
	c.add(label ?? `${rel} has no ${needle} (non-comment lines)`, n === 0, 0, n === null ? "file absent" : n);
}

function absent(c, rel) {
	c.add(`${rel} absent`, !existsSync(join(ROOT, rel)), "absent", existsSync(join(ROOT, rel)) ? "present" : "absent");
}

function present(c, rel) {
	c.add(`${rel} present`, existsSync(join(ROOT, rel)), "present", existsSync(join(ROOT, rel)) ? "present" : "absent");
}

function rgEmpty(c, label, args) {
	const out = rg(args);
	c.add(label, out.length === 0, "no match", out.length === 0 ? "no match" : out.slice(0, 10));
}

function unitCheck(c, ctx, rel) {
	const r = unitPassed(ctx.unitReport, rel);
	c.add(`${rel} passed in the unit report`, r.pass, "passed", r.measured);
}

function themeProviderTag(text) {
	if (text === null) return null;
	const lines = text.split("\n");
	const start = lines.findIndex((l) => l.includes("<ThemeProvider"));
	if (start === -1) return null;
	const out = [];
	for (let i = start; i < lines.length; i++) {
		out.push(lines[i]);
		if (lines[i].includes(">")) break;
	}
	return out.join("\n");
}

function variantKeys(text) {
	if (text === null) return [];
	const lines = text.split("\n");
	const keys = [];
	let depth = 0;
	let inBlock = false;
	for (const line of lines) {
		if (!inBlock && /\bvariants:\s*\{/.test(line)) {
			inBlock = true;
			depth = 0;
		}
		if (inBlock) {
			const m = line.match(/^\s*"?([a-zA-Z-]+)"?:\s*["`]/);
			if (m && depth >= 2) keys.push(m[1]);
			for (const ch of line) {
				if (ch === "{") depth++;
				else if (ch === "}") depth--;
			}
			if (depth <= 0 && !/\bvariants:\s*\{\s*$/.test(line)) inBlock = false;
		}
	}
	return [...new Set(keys)].sort();
}

function stateActiveTokens(text) {
	if (text === null) return [];
	return [...new Set(text.match(/[^\s"'`]*data-\[state=active\]:[^\s"'`]+/g) ?? [])].sort();
}

const SOURCE_CHECKS = {
	C1(c) {
		contains(c, `${UI}/input-otp.tsx`, 'data-slot="input-otp-slot"');
	},
	C2(c) {
		contains(c, `${UI}/chart.tsx`, "[&_.recharts-cartesian-grid_line[stroke]]:stroke-border/50");
		contains(c, `${UI}/chart.tsx`, "[&_.recharts-dot[stroke]]:stroke-transparent");
		const text = readHead(`${UI}/chart.tsx`);
		c.add(`${UI}/chart.tsx has no [stroke=' selector`, text !== null && !text.includes("[stroke='"), 0, countOf(text, "[stroke='"));
		const hex = text === null ? null : regexCount(codeLines(text), /#[0-9a-fA-F]{3,8}\b/);
		c.add(`${UI}/chart.tsx non-comment lines have no hex literal`, hex === 0, 0, hex);
	},
	C3(c) {
		contains(c, `${UI}/command.tsx`, "**:data-[slot=command-input-wrapper]:h-12");
		contains(c, `${UI}/command.tsx`, "h-11", `${UI}/command.tsx CommandInput keeps h-11`);
	},
	C4(c) {
		absent(c, `${UI}/toast.tsx`);
		present(c, `${UI}/sonner.tsx`);
		contains(c, "src/app/layout.tsx", '"#components/ui/sonner"', "src/app/layout.tsx imports #components/ui/sonner");
		rgEmpty(c, "no sonner-toast or toaster group hook in src (tests excluded)", [
			"-n",
			"sonner-toast|toaster group",
			"src",
			"-g",
			"!**/__tests__/**",
			"-g",
			"!*.test.*",
		]);
		lacksInCode(c, `${UI}/sonner.tsx`, "style=");
		contains(c, `${UI}/sonner.tsx`, "[--normal-bg:var(--color-popover)]!");
		const text = readHead(`${UI}/sonner.tsx`);
		const imp = text?.match(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/);
		const names = imp ? imp[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
		const want = ["CircleCheckIcon", "InfoIcon", "Loader2Icon", "OctagonXIcon", "TriangleAlertIcon"];
		c.add(`${UI}/sonner.tsx imports the five lucide icons`, want.every((n) => names.includes(n)), want, names);
	},
	C5(c, ctx) {
		contains(c, `${UI}/progress.tsx`, "value={value}");
		contains(c, "src/components/bulk-import/bulk-import-confirm-step.tsx", 'aria-label="Import progress"');
		unitCheck(c, ctx, `${UI}/__tests__/progress.test.tsx`);
	},
	C6(c) {
		contains(c, `${UI}/card.tsx`, "has-data-[slot=card-action]:");
		rgEmpty(c, "no has-.card-action selector in src", ["-n", "-F", "has-.card-action", "src"]);
	},
	C7(c) {
		contains(c, `${UI}/calendar.tsx`, "[[data-slot=popover-content]_&]:bg-transparent");
		contains(c, `${UI}/popover.tsx`, 'data-slot="popover-content"');
	},
	C8(c, ctx) {
		const prov = readHead("src/components/providers.tsx");
		c.add("providers.tsx has exactly one <TooltipProvider", countOf(prov, "<TooltipProvider") === 1, 1, countOf(prov, "<TooltipProvider"));
		const tip = readHead(`${UI}/tooltip.tsx`);
		c.add(`${UI}/tooltip.tsx has 0 <TooltipProvider`, tip !== null && countOf(tip, "<TooltipProvider") === 0, 0, countOf(tip, "<TooltipProvider"));
		contains(c, `${UI}/tooltip.tsx`, "delayDuration = 0");
		const outside = rg(["-l", "-F", "<TooltipProvider", "src", "-g", "!**/__tests__/**", "-g", "!*.test.*"]).filter(
			(f) => f !== "src/components/providers.tsx" && !f.startsWith(`${UI}/`),
		);
		c.add("<TooltipProvider in 0 non-test files outside providers.tsx and ui/", outside.length === 0, [], outside);
		const log = ctx.unitLog ?? "";
		const n = log.split("\n").filter((l) => /must be used within .TooltipProvider/.test(l)).length;
		c.add("unit log has 0 `must be used within .TooltipProvider` lines", ctx.unitLog !== null && n === 0, 0, ctx.unitLog === null ? "log absent" : n);
		const head = themeProviderTag(prov);
		const pre = themeProviderTag(readAt(ctx.pre, "src/components/providers.tsx"));
		c.add("ThemeProvider opening tag byte-identical at PRE_W5 and HEAD (T-CSP)", head !== null && head === pre, pre, head);
	},
	C9(c, ctx) {
		unitCheck(c, ctx, `${UI}/__tests__/naming-conventions.test.tsx`);
		for (const s of [
			'data-slot="button"',
			"data-variant",
			"data-size",
			"Slot.Root",
			"shrink-0",
			"[&_svg:not([class*='size-'])]:size-4",
			"focus-visible:ring-[3px]",
			"aria-invalid:border-destructive",
		])
			contains(c, `${UI}/button.tsx`, s);
		const census = ctx.census;
		const counts = census?.counts ?? {};
		for (const k of ["convert", "attrSized", "mixed", "unresolved", "nestedSized"])
			c.add(`census counts.${k} 0`, census !== null && counts[k] === 0, 0, census === null ? MISSING : (counts[k] ?? MISSING));
		c.add(
			"census parentSvgSelectors empty",
			Array.isArray(census?.parentSvgSelectors) && census.parentSvgSelectors.length === 0,
			[],
			census?.parentSvgSelectors ?? MISSING,
		);
		const addShrink = (census?.shrink ?? []).filter((r) => r.verdict === "add-shrink");
		c.add("census has no add-shrink row", census !== null && addShrink.length === 0, 0, addShrink.length);
	},
	C10(c) {
		contains(c, `${UI}/dropdown-menu.tsx`, "checked={checked}");
		lacksInCode(c, `${UI}/dropdown-menu.tsx`, "checked ?? false");
		contains(c, `${UI}/slider.tsx`, "value={value}");
		contains(c, `${UI}/sonner.tsx`, 'NonNullable<ToasterProps["theme"]>');
	},
	C11(c) {
		absent(c, `${UI}/mobile-nav.tsx`);
		absent(c, `${UI}/__tests__/mobile-nav.test.tsx`);
		rgEmpty(c, "no ui/mobile-nav reference in src", ["-n", "ui/mobile-nav", "src"]);
		const a = existsSync(join(ROOT, `${UI}/sidebar/context.tsx`));
		const b = existsSync(join(ROOT, `${UI}/server-sidebar-provider.tsx`));
		c.add("w6 remnants present: sidebar/context.tsx, server-sidebar-provider.tsx", a && b, [true, true], [a, b]);
	},
	C12a(c) {
		const text = readHead(`${UI}/grid-pattern.tsx`);
		const spaced = regexCount(text, /(fill|stroke)-\[[^\]"]* /);
		c.add(`${UI}/grid-pattern.tsx has no space inside a fill-/stroke- bracket`, text !== null && spaced === 0, 0, spaced);
		const lp = countOf(text, "label-primary");
		c.add(`${UI}/grid-pattern.tsx has 0 label-primary`, text !== null && lp === 0, 0, lp);
		const cc = ctx_w5("candidate-css.json");
		const n = cc === null ? null : Object.keys(cc).filter((k) => k.startsWith("fill-[color-mix(in_oklab") || k.startsWith("stroke-[color-mix(in_oklab")).length;
		c.add("w5/candidate-css.json has >= 10 fill/stroke color-mix keys", n !== null && n >= 10, ">= 10", n);
	},
	C12b(c) {
		const cc = ctx_w5("candidate-css.json");
		c.add("w5/candidate-css.json has after:animate-border-beam", cc !== null && "after:animate-border-beam" in cc, true, cc !== null && "after:animate-border-beam" in cc);
		const css = readHead(".planning/tailwind-shadcn/audit/w5/compiled.css");
		c.add("w5/compiled.css contains @keyframes border-beam", css !== null && css.includes("@keyframes border-beam"), true, css !== null && css.includes("@keyframes border-beam"));
		const report = ctx_w5("report.json");
		const v = report?.nonInlineThemeVarsReferencingVars;
		c.add("w5/report.json nonInlineThemeVarsReferencingVars empty (G2)", Array.isArray(v) && v.length === 0, [], v ?? MISSING);
	},
	C12c(c, ctx) {
		const text = readHead(`${UI}/blur-fade.tsx`);
		const code = text === null ? null : codeLines(text);
		const banned = code === null ? null : regexCount(code, /IntersectionObserver|useInView|aria-hidden|will-change/);
		c.add(`${UI}/blur-fade.tsx non-comment lines: 0 IntersectionObserver|useInView|aria-hidden|will-change`, banned === 0, 0, banned);
		const tpl = code === null ? null : countOf(code, "className={`");
		c.add(`${UI}/blur-fade.tsx: no template-literal className`, tpl === 0, 0, tpl);
		rgEmpty(c, "no <BlurFade with inView/yOffset/onAnimationComplete", ["-U", "<BlurFade[^>]*\\b(inView|yOffset|onAnimationComplete)\\b", "src", "-g", "*.tsx"]);
		const decl = rg(["-l", "(interface|type)\\s+BlurFadeProps\\b", "src"]);
		c.add("BlurFadeProps declared only in src/types/frontend.ts", decl.length === 1 && decl[0] === "src/types/frontend.ts", ["src/types/frontend.ts"], decl);
		unitCheck(c, ctx, "src/components/dashboard/components/__tests__/kpi-bento-row.test.tsx");
	},
	C13(c) {
		contains(c, `${UI}/button-group.tsx`, "has-[>[data-slot=button-group]]");
		lacksInCode(c, `${UI}/button-group.tsx`, "has-[>.button-group]");
	},
	C14(c) {
		const A = ".planning/tailwind-shadcn/audit/plan-20";
		const need = {};
		for (const f of ["slot-diff-ten.json", "slot-diff-c6-c13.json"]) {
			const t = readHead(`${A}/${f}`);
			if (t === null) {
				c.add(`${A}/${f} present`, false, "present", "absent");
				continue;
			}
			for (const row of JSON.parse(t).files ?? []) need[row.file] = (row.addedSlots ?? []).length;
		}
		c.add("plan-20 slot-diff lists twelve files", Object.keys(need).length === 12, 12, Object.keys(need).length);
		const mins = { button: 1, calendar: 1, chart: 1, "dropdown-menu": 7, "input-otp": 4, popover: 3, progress: 2, sheet: 9, slider: 4 };
		for (const [name, n] of Object.entries(mins)) need[`${UI}/${name}.tsx`] = Math.max(need[`${UI}/${name}.tsx`] ?? 0, n);
		for (const [file, n] of Object.entries(need).sort()) {
			const got = countOf(readHead(file), "data-slot=");
			c.add(`${file} data-slot= count >= ${n}`, got >= n, `>= ${n}`, got);
		}
		contains(c, `${UI}/alert-dialog.tsx`, 'data-slot="alert-dialog-action"');
		contains(c, `${UI}/alert-dialog.tsx`, 'data-slot="alert-dialog-cancel"');
	},
	C15(c, ctx) {
		absent(c, "src/test/mocks/recharts-tooltip.ts");
		rgEmpty(c, 'no "recharts/types/ import specifier in src', ["-n", "-e", '(from |import\\()"recharts/types/', "src"]);
		rgEmpty(c, 'no "recharts/types/ in vitest.config.ts', ["-n", "-F", '"recharts/types/', "vitest.config.ts"]);
		rgEmpty(c, "no mocks/recharts-tooltip reference", ["-n", "-F", "mocks/recharts-tooltip", "src", "vitest.config.ts"]);
		contains(c, `${UI}/chart-tooltip.tsx`, "type TooltipNameType = number | string");
		unitCheck(c, ctx, `${UI}/__tests__/chart.test.tsx`);
	},
	C16(c, ctx) {
		unitCheck(c, ctx, `${UI}/__tests__/alert-dialog.test.tsx`);
		contains(c, `${UI}/confirm-dialog.tsx`, "variant={confirmVariant}");
		const lit = rg(["-l", "-F", "bg-destructive text-destructive-foreground hover:bg-destructive/90", "src"]).filter((f) => !f.startsWith(`${UI}/`));
		c.add("0 literal destructive class strings outside ui/", lit.length === 0, [], lit);
		const bv = rg(["-l", "-U", 'buttonVariants\\(\\{\\s*variant:\\s*"destructive"', "src"]).filter((f) => !f.startsWith(`${UI}/`));
		c.add('0 buttonVariants({ variant: "destructive" }) outside ui/', bv.length === 0, [], bv);
	},
	N1(c) {
		const file = "src/components/auth/update-password-form.tsx";
		contains(c, file, "bg-primary/10");
	},
	N3(c) {
		const css = readHead("src/app/globals.css");
		const m = css?.match(/@theme inline\s*\{[\s\S]*?--animate-border-beam:[^;]*;/);
		c.add("globals.css declares --animate-border-beam inside an @theme inline block", Boolean(m), true, Boolean(m));
		contains(c, "src/app/globals.css", "@keyframes border-beam");
		const report = ctx_w5("report.json");
		const v = report?.nonInlineThemeVarsReferencingVars;
		c.add("w5/report.json nonInlineThemeVarsReferencingVars empty", Array.isArray(v) && v.length === 0, [], v ?? MISSING);
	},
	SHEET(c, ctx) {
		unitCheck(c, ctx, `${UI}/__tests__/sheet.test.tsx`);
	},
	"D-04"(c, ctx) {
		rgEmpty(c, 'no from "cn" or from "@/" import in src', ["-n", 'from "cn"|from "@/', "src"]);
		const changed = execFileSync("git", ["diff", "--name-only", "--no-renames", ctx.pre, "HEAD", "--", UI], { cwd: ROOT, encoding: "utf8" })
			.split("\n")
			.filter((f) => f && /\.tsx?$/.test(f) && existsSync(join(ROOT, f)));
		const bad = [];
		for (const f of changed) {
			const code = codeLines(readHead(f));
			if (/\bcn\(/.test(code) && !/import\s*\{[^}]*\bcn\b[^}]*\}\s*from\s*"#lib\/utils"/.test(code)) bad.push(f);
		}
		c.add(`every changed ui file that calls cn( imports it from #lib/utils (${changed.length} files)`, bad.length === 0, [], bad);
	},
	"D-26"(c, ctx) {
		const btn = readHead(`${UI}/button.tsx`);
		c.add("button.tsx has >= 4 min-h-11", countOf(btn, "min-h-11") >= 4, ">= 4", countOf(btn, "min-h-11"));
		c.add("button.tsx has >= 1 min-w-11", countOf(btn, "min-w-11") >= 1, ">= 1", countOf(btn, "min-w-11"));
		for (const s of ["typography-small", "text-primary-text", "text-destructive-foreground"]) contains(c, `${UI}/button.tsx`, s);
		lacksInCode(c, `${UI}/button.tsx`, "text-white");
		contains(c, `${UI}/dialog.tsx`, "intent");
		contains(c, `${UI}/dialog.tsx`, "DialogBody");
		const sel = readHead(`${UI}/select.tsx`);
		c.add(`${UI}/select.tsx defaults position = "popper"`, /position\s*=\s*"popper"/.test(sel ?? ""), 'position = "popper"', /position\s*=\s*"popper"/.test(sel ?? ""));
		contains(c, `${UI}/badge.tsx`, "rounded-md");
		contains(c, `${UI}/slider.tsx`, "bg-background");
		contains(c, `${UI}/calendar.tsx`, "h-11");
		contains(c, `${UI}/input-otp.tsx`, "size-11");
		contains(c, `${UI}/sheet.tsx`, "min-h-11");
		contains(c, `${UI}/sheet.tsx`, "min-w-11");
		contains(c, `${UI}/sheet.tsx`, 'aria-label="Close"');
		lacksInCode(c, `${UI}/sheet.tsx`, "Close dialog");
		contains(c, `${UI}/sonner.tsx`, '?? "system"');
		const tabsPre = stateActiveTokens(readAt(ctx.pre, `${UI}/tabs.tsx`));
		const tabsHead = new Set(stateActiveTokens(readHead(`${UI}/tabs.tsx`)));
		const lostTabs = tabsPre.filter((t) => !tabsHead.has(t));
		c.add(`every tabs data-[state=active]: token at PRE_W5 is at HEAD (${tabsPre.length})`, tabsPre.length > 0 && lostTabs.length === 0, tabsPre, lostTabs);
		for (const name of ["badge", "card", "progress", "input"]) {
			const pre = variantKeys(readAt(ctx.pre, `${UI}/${name}.tsx`));
			const head = new Set(variantKeys(readHead(`${UI}/${name}.tsx`)));
			const lost = pre.filter((k) => !head.has(k));
			c.add(`${name}.tsx keeps every cva variant key of PRE_W5 (${pre.length})`, lost.length === 0, pre, lost);
		}
	},
};

let W5_CACHE = {};
function ctx_w5(name) {
	if (name in W5_CACHE) return W5_CACHE[name];
	const t = readHead(`.planning/tailwind-shadcn/audit/w5/${name}`);
	W5_CACHE[name] = t === null ? null : JSON.parse(t);
	return W5_CACHE[name];
}

// ---------- evaluation ----------

function evaluate({ probes, tokens, probeOnly, ctx }) {
	const claims = [];
	for (const id of CLAIM_IDS) {
		const c = createCollector();
		const probeFn = PROBE_CHECKS[id];
		if (probeFn) probeFn(c, probes, tokens);
		const probeCount = c.checks.length;
		if (!probeOnly && SOURCE_CHECKS[id]) SOURCE_CHECKS[id](c, ctx);
		const claim = { id, pass: c.checks.every((x) => x.pass), probeChecks: probeCount, checks: c.checks };
		if (probeOnly && probeCount === 0) claim.note = "probe-only: no probe check";
		claims.push(claim);
	}
	const vdCoverage = {};
	for (const [vd, claimId] of Object.entries(VD_MAP)) {
		const cl = claims.find((x) => x.id === claimId);
		const pc = cl.checks.slice(0, cl.probeChecks);
		vdCoverage[vd] = pc.length > 0 && pc.every((x) => x.pass);
	}
	const failed = claims.filter((x) => !x.pass).length;
	return { claims, vdCoverage, failed };
}

// ---------- self-test ----------

function syntheticTokens() {
	return {
		light: { primary: [0, 100, 239, 1], secondary: [222, 243, 255, 1], popover: [255, 255, 255, 1], "popover-foreground": [14, 23, 30, 1], border: [210, 216, 222, 1], foreground: [14, 23, 31, 1] },
		dark: { primary: [67, 159, 255, 1], secondary: [37, 41, 46, 1], popover: [3, 6, 11, 1], "popover-foreground": [236, 243, 248, 1], border: [41, 46, 53, 1], foreground: [236, 243, 248, 1] },
	};
}

function syntheticProbes(T) {
	const results = {};
	const slot = { width: 44, height: 56, fontSize: "20px", borderWidths: [1, 1, 1, 1], radii: [8, 8, 8, 8] };
	for (const theme of THEMES) {
		const t = T[theme];
		const set = (id, v) => {
			results[id] ??= {};
			results[id][theme] = v;
		};
		const otp = { slotCount: 6, dataSlotCount: 10, slots: Array.from({ length: 6 }, () => ({ ...slot })) };
		set(PROBE_IDS.otpSetup, structuredClone(otp));
		set(PROBE_IDS.otpMfa, structuredClone(otp));
		set(PROBE_IDS.chart, { gridLineCount: 5, gridStroke: [...t.border.slice(0, 3), 0.5], activeDotStroke: [0, 0, 0, 0], activeDotStrokeWidth: "2px", borderToken: [...t.border] });
		set(PROBE_IDS.command, { wrapperHeight: 48, inputHeight: 48, inputOverflowsWrapper: false, inputOverflowPx: 0.5, wrapperBorderBottomPx: 1 });
		set(PROBE_IDS.datePopover, { popoverContentDataSlotCount: 1, popoverBg: [...t.popover], calendarBg: [0, 0, 0, 0], popoverRadius: "8px", cornerPatchMaxDiffVsPlain: 0 });
		set(PROBE_IDS.gridPattern, { svgStroke: "oklab(0.2 0 0 / 0.25)", pathStroke: "oklab(0.2 0 0 / 0.25)", svgStrokeRgba: [...t.foreground.slice(0, 3), 0.25] });
		for (const [id, duration] of [
			[PROBE_IDS.beamStats, 10],
			[PROBE_IDS.beamGrid, 12],
		])
			set(id, { props: { duration }, afterBackgroundImage: "linear-gradient(to left, a, b)", afterAnimationName: "border-beam", afterAnimationDuration: `${duration}s`, runningAnimations: 1 });
		const blur = { ssrHtmlHasOpacity0: false, ssrAriaHidden: null, opacityAtStart: 0, opacityAtEnd: 1, ariaHiddenAtEnd: null, dataSlot: "blur-fade", ioConstructions: null };
		set(PROBE_IDS.blurNoJs, { ...blur });
		set(PROBE_IDS.blurReducedMotion, { ...blur, opacityAtStart: 1 });
		set(PROBE_IDS.blurIoStub, { ...blur, ioConstructions: 0 });
		set(PROBE_IDS.passwordBadge, { classes: "mx-auto bg-primary/10 p-3", bg: [...t.primary.slice(0, 3), 0.1] });
		set(PROBE_IDS.dataTable, { cellBg: [0, 0, 0, 0], headerCellBg: [0, 0, 0, 0], hoverRowBg: [1, 2, 3, 0.5], selectedRowBg: [1, 2, 3, 1] });
		const sheet = { contentDataSlot: "sheet-content", closeButtonCount: 1, closeWidth: 44, closeHeight: 44, closeAriaLabel: "Close", closeSrOnlyTextCount: 0 };
		set(PROBE_IDS.sheet, { ...sheet });
		set(PROBE_IDS.sheetNoClose, { ...sheet, closeButtonCount: 0 });
		set(PROBE_IDS.sheetSlotOverride, { ...sheet, contentDataSlot: "sidebar" });
		const ring = theme === "light" ? [0, 91, 209, 1] : [67, 159, 255, 1];
		const refs = { border: [...t.border], input: [9, 9, 9, 1], destructive: [200, 0, 0, 1], ring };
		const focus = { focusVisible: true, outlineStyle: "none", boxShadow: "x 0px 0px 0px 0px, y 0px 0px 0px 3px", borderColor: [...ring] };
		const variants = {};
		for (const v of ["default", "destructive", "outline", "secondary", "ghost", "link"])
			variants[v] = { dataSlot: "button", dataVariant: v, dataSize: "default", height: 44, flexShrink: "0", bg: [1, 1, 1, 1], borderColor: [...t.border], boxShadowRest: "none", focus: structuredClone(focus) };
		variants.default.bg = [...t.primary];
		variants.secondary.bg = [...t.secondary];
		variants.ghost.bg = [0, 0, 0, 0];
		variants.link.bg = [0, 0, 0, 0];
		variants.outline.boxShadowRest = "z 0px 1px 2px 0px";
		if (theme === "dark") {
			variants.outline.bg = [9, 9, 9, 0.3];
			variants.destructive.bg = [200, 0, 0, 0.6];
		}
		set(PROBE_IDS.button, {
			variants,
			sizes: { sm: { height: 44 }, lg: { height: 44 }, icon: { height: 44, width: 44 } },
			invalid: { borderColor: [...refs.destructive] },
			asChild: { tag: "A", dataSlot: "button", buttonCount: 0 },
			icons: { unsized: [16, 16], size5: [20, 20], hw5: [16, 16] },
			refs,
		});
		const toastBase = {
			toasterClass: "[--normal-bg:var(--color-popover)]!",
			toasterInlineNormalBg: "",
			toastBg: [...t.popover],
			toastColor: [...t["popover-foreground"]],
			toastBorderColor: [...t.border],
			toastRadius: "8px",
			popoverToken: [...t.popover],
			popoverFgToken: [...t["popover-foreground"]],
			borderToken: [...t.border],
			iconClasses: null,
			iconWidth: null,
		};
		set(PROBE_IDS.toastDefault, structuredClone(toastBase));
		set(PROBE_IDS.toastSuccess, { ...structuredClone(toastBase), toastBg: [120, 250, 140, 1], iconClasses: ["lucide", "lucide-circle-check", "size-4"], iconWidth: 16 });
		set(PROBE_IDS.toastError, { ...structuredClone(toastBase), toastBg: [250, 120, 120, 1], iconClasses: ["lucide", "lucide-octagon-x", "size-4"], iconWidth: 16 });
		set(PROBE_IDS.toastLoading, { ...structuredClone(toastBase), iconClasses: ["lucide", "lucide-loader-circle", "size-4", "animate-spin"], iconWidth: 23 });
	}
	return { meta: {}, results };
}

function selfTest() {
	const T = syntheticTokens();
	const base = syntheticProbes(T);
	const run = (p) => evaluate({ probes: p, tokens: T, probeOnly: true, ctx: null });
	const failures = [];
	let passed = 0;
	const r0 = run(base);
	if (r0.failed !== 0) failures.push(`base object fails: ${r0.claims.filter((x) => !x.pass).map((x) => x.id).join(",")}`);
	else passed++;
	if (!Object.values(r0.vdCoverage).every(Boolean)) failures.push("base vdCoverage not all true");
	else passed++;
	const mutations = [
		["C1", (p) => (p.results[PROBE_IDS.otpSetup].dark.slots[3].height = 40)],
		["C2", (p) => (p.results[PROBE_IDS.chart].light.gridStroke = [204, 204, 204, 1])],
		["C3", (p) => (p.results[PROBE_IDS.command].light.wrapperHeight = 44)],
		["C4", (p) => (p.results[PROBE_IDS.toastDefault].dark.toastRadius = "6px")],
		["C7", (p) => (p.results[PROBE_IDS.datePopover].light.calendarBg = [249, 250, 251, 1])],
		["C9", (p) => (p.results[PROBE_IDS.button].light.variants.outline.focus.boxShadow = "x 0px 0px 0px 2px, y 0px 0px 0px 4px")],
		["C12a", (p) => (p.results[PROBE_IDS.gridPattern].dark.svgStroke = "none")],
		["C12b", (p) => (p.results[PROBE_IDS.beamGrid].light.afterAnimationName = "none")],
		["C12c", (p) => (p.results[PROBE_IDS.blurIoStub].dark.ioConstructions = 1)],
		["N1", (p) => (p.results[PROBE_IDS.passwordBadge].light.bg = [0, 0, 0, 0])],
		["N2", (p) => (p.results[PROBE_IDS.dataTable].dark.cellBg = [255, 255, 255, 1])],
		["SHEET", (p) => (p.results[PROBE_IDS.sheet].light.closeAriaLabel = null)],
		["C2", (p) => delete p.results[PROBE_IDS.chart].dark.borderToken],
		["C9", (p) => delete p.results[PROBE_IDS.button]],
	];
	for (const [claim, mutate] of mutations) {
		const p = structuredClone(base);
		mutate(p);
		const r = run(p);
		const f = r.claims.filter((x) => !x.pass).map((x) => x.id);
		if (f.length === 1 && f[0] === claim) passed++;
		else failures.push(`mutating ${claim} failed ${JSON.stringify(f)}`);
	}
	// tolRgb is the fixed function of the measured alpha.
	const tolCases = [
		[1, 3],
		[0.5, 3],
		[0.25, 3],
		[0.1, 6],
	];
	for (const [a, want] of tolCases) {
		if (tolRgb(a) === want) passed++;
		else failures.push(`tolRgb(${a}) = ${tolRgb(a)}, want ${want}`);
	}
	if (failures.length) {
		console.error(`w5-claims self-test: FAILED\n${failures.join("\n")}`);
		process.exit(1);
	}
	console.log(`w5-claims self-test: ${passed} passed`);
}

// ---------- CLI ----------

function arg(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? null : process.argv[i + 1];
}

function readJson(p) {
	return p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

if (process.argv.includes("--self-test")) {
	selfTest();
	process.exit(0);
}

const probeOnly = process.argv.includes("--probe-only");
const probes = readJson(arg("--probes"));
const tokens = readJson(arg("--tokens"));
const out = arg("--out");
if (!probes || !tokens || !out) {
	console.error("usage: w5-claims.mjs --probes <json> --tokens <json> [--unit-report <json> --unit-log <file> --census <json> --pre <sha>] --out <file> [--probe-only] [--expect-fail ids] | --self-test");
	process.exit(2);
}
let ctx = null;
if (!probeOnly) {
	const pre = arg("--pre");
	if (!pre) {
		console.error("--pre <sha> is required unless --probe-only");
		process.exit(2);
	}
	const logPath = arg("--unit-log");
	ctx = {
		pre,
		unitReport: readJson(arg("--unit-report")),
		unitLog: logPath && existsSync(logPath) ? readFileSync(logPath, "utf8") : null,
		census: readJson(arg("--census")),
	};
}
const result = evaluate({ probes, tokens, probeOnly, ctx });
const expectFail = arg("--expect-fail");
const report = { mode: probeOnly ? "probe-only" : "full", probes: arg("--probes"), tokens: arg("--tokens"), ...result };
if (expectFail !== null) report.expectFail = expectFail.split(",").filter(Boolean).sort();
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
const failedIds = result.claims.filter((x) => !x.pass).map((x) => x.id);
for (const cl of result.claims) console.log(`${cl.pass ? "PASS" : "FAIL"} ${cl.id} ${cl.checks.filter((x) => x.pass).length}/${cl.checks.length}`);
console.log(`failed: ${result.failed} ${JSON.stringify(failedIds)}; vdCoverage: ${JSON.stringify(result.vdCoverage)}`);
if (expectFail !== null) {
	const want = report.expectFail;
	const got = [...failedIds].sort();
	const same = want.length === got.length && want.every((x, i) => x === got[i]);
	if (!same) console.error(`expect-fail mismatch: want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
	process.exit(same ? 0 : 1);
}
process.exit(result.failed > 0 ? 1 : 0);
