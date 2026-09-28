import React, { useState } from "react";
import { BookOpen, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------------------------
// The floor manual. Lives inside the app, behind the same login, so nobody needs another account
// to read how the job is done — and so it can never drift from the thing it describes.
//
// Content is data, not markup: each procedure says which roles it belongs to, and the reader opens
// on their OWN role because the app already knows who they are. Everything is still one tap away.
// ---------------------------------------------------------------------------------------------

const ROLES = [
  { key: "all", label: "Everything" },
  { key: "trim", label: "Trimming Manager" },
  { key: "intake", label: "Intake" },
  { key: "sales", label: "Sales Rep" },
  { key: "manager", label: "Manager" },
  { key: "admin", label: "Admin" },
];

const HARD_RULES = [
  ["One Metrc tag per label.", "A sticker with two tags on it means nothing to Metrc. If a batch carries several, the app asks which one you're printing."],
  ["Nothing ships without a manifest number and a package tag on every line.", "Mark Shipped stays dead until both are in. It's a lock, not a reminder."],
  ["Labels read in grams.", "Everything on the floor is weighed on a gram scale, so that's what prints."],
  ["Never delete a shipped order to fix a mistake.", "Edit it. Deleting takes the inventory movements with it."],
  ["Count what's on the shelf, not what you expect.", "Reconcile only adjusts where your count differs, and every change is logged with your name."],
];

const SECTIONS = [
  {
    id: "log-trim", roles: ["trim", "manager", "admin"], who: "Trimming Manager",
    title: "Logging a day of trim",
    lede: "One entry per batch per day. The log you save is the record that follows that flower into inventory, so it gets entered before people go home.",
    steps: [
      ["Trim Log → Log Trim.", "Set the date at the top if you're catching up on a day that's already passed."],
      ["Pick the bucked batch you were working.", "The picker shows what's left of each one."],
      ["Fill in Room #, Strain # and Bins Trimmed.", "Bins is one number for the batch — how many got worked through that day. Not per trimmer; everyone pulls from the same bins."],
      ["Choose how it was recorded.", "By Grade when you have each trimmer's weight broken out. Total + Split when you have each trimmer's total and one grade split for the batch."],
      ["Enter every trimmer and their weight.", "A, B and C show by default. Press + Add D / TRIM if you need those columns."],
      ["Add Machine Trim and Shake / Trim at the bottom.", "These sit outside the graded totals and roll into the grand total."],
      ["Save.", "The day's log prints and downloads as a PDF, grouped by batch."],
    ],
    notes: [
      ["Caught a typo minutes later?", "Today's Entries sits right on the Log Trim view. Fix the name, the date or the weight by grade there."],
      ["Need a past day again?", "Trim Log Archive, under the view toggle. Every past day has Print and Download PDF, and the PDF is the same document Print opens."],
    ],
  },
  {
    id: "fix-trim", roles: ["manager", "admin"], who: "Manager · Admin",
    title: "Fixing a whole day's trim log",
    lede: "When a day went in wrong — wrong date, missing trimmer, weights transposed — edit the day, not the pieces.",
    steps: [
      ["Trim Log → All Trim Entries."],
      ["Find the day under Edit a Day's Trim Log, at the top of the screen."],
      ["Edit Day opens the whole log at once.", "Date, room, strain, bins, every trimmer's weight by grade, machine trim and shake."],
      ["Add or remove trimmer rows as needed.", "Batch totals recalculate from the rows — you never type a total directly."],
      ["Save Day.", "The day's totals and the printed log follow the change."],
    ],
    notes: [
      ["The app will refuse an edit that touches a grade already admitted into inventory.", "That flower has a Metrc tag on it now. Adjust inventory instead.", true],
      ["Changing the date moves the whole day, not one trimmer.", "One person on a different date than their own log would split the day in two."],
    ],
  },
  {
    id: "bucked", roles: ["intake", "manager", "admin"], who: "Intake",
    title: "Taking in bucked flower",
    lede: "Bucked flower arrives on a manifest and goes into bins. Log the manifest first, then label the bins.",
    steps: [
      ["Intake → Bucked Flower."],
      ["Enter the manifest number and date once for the whole delivery."],
      ["Add each line.", "Origin, room, strain, batch number, Metrc package tag, weight. Keep adding until the manifest is complete."],
      ["Log Full Manifest."],
      ["Print bin labels.", "On the confirmation panel, type how many bins that line went into and press Print Bin Labels. Each prints Bin n of N."],
    ],
    notes: [
      ["Bin labels print no weight — there's a blank line for it.", "Weigh each bin on the scale and write the reading in."],
      ["Taking in several manifests before labelling?", "Reprint Bin Labels at the bottom of the intake screen holds the last 20 deliveries, each with its own bin count."],
    ],
  },
  {
    id: "bulk", roles: ["intake", "manager", "admin"], who: "Intake",
    title: "Taking in bulk flower",
    lede: "Finished flower coming in by the pound, already graded.",
    steps: [
      ["Intake → Bulk Flower. Enter the manifest number."],
      ["Add each item with its strain, batch, grade, Metrc tag and weight."],
      ["Log it.", "Labels print automatically — one per full pound plus one for the remainder. 12.50 lb gives you 13 labels, the last reading 227 g."],
    ],
    notes: [],
  },
  {
    id: "admit", roles: ["manager", "admin"], who: "Manager · Admin",
    title: "Moving trimmed flower into inventory",
    lede: "Flower the trim team logged sits held until someone attaches a Metrc tag to it. Until then it isn't sellable and it isn't in stock.",
    steps: [
      ["Intake → Trimmed — Awaiting Inventory.", "Items are grouped by the day they were trimmed."],
      ["Add a Metrc tag and the weight on that tag.", "One package, one tag. If it went out under several tags, add each with its own weight."],
      ["Authorize.", "The flower enters live inventory under its batch number and grade, and labels print — one per pound plus the remainder, each carrying its own weight."],
    ],
    notes: [
      ["Already entered it into Metrc another way? Press Already Entered.", "It clears from the queue without creating a second inventory record. The trim log keeps it either way — the trimmers' weight and the day's totals don't move."],
      ["Labels didn't come out?", "ADMITTED — REPRINT LABELS, lower on the same screen. Search by strain, batch, grade, tag or date, then Reprint."],
    ],
  },
  {
    id: "order", roles: ["sales", "manager", "admin"], who: "Sales Rep · Manager · Admin",
    title: "Creating an order",
    lede: "Creating the order prints the invoice and puts the product on hold. Nothing leaves inventory until it ships.",
    steps: [
      ["Orders → New Order → Customer Order."],
      ["Check the Order Date.", "It defaults to today. Entering an order from a previous day? Set it — the field warns you when it isn't today."],
      ["Pick the customer, or leave it on + New customer and type them in.", "New customers save automatically."],
      ["Tick Bill To is different only when the billing company isn't the one receiving the product."],
      ["Add line items.", "Search by strain, room, batch number or Metrc tag. The chip shows what's actually available — stock less anything held on other orders — and says who has the rest."],
      ["Create Order & Print Invoice."],
    ],
    notes: [
      ["Mixed facilities split automatically.", "An order with both Daddy's and MERC product becomes two invoices, because the two are separate companies with separate finances. Use the Shipment Summary from either one for the paperwork that rides with the manifest."],
    ],
  },
  {
    id: "samples", roles: ["sales", "manager", "admin"], who: "Sales Rep · Manager · Admin",
    title: "Samples",
    lede: "A sample is product in someone else's hands that may come back. It never takes an invoice number until it becomes a sale.",
    table: {
      head: ["What happens", "Number it carries", "Counts as revenue"],
      rows: [
        ["Sample goes out", "SMP-0001", "No — held, not sold"],
        ["Sample comes back", "SMP-0001 (kept)", "No — hold released"],
        ["Sample converts to a sale", "NG-1042 / MERC-10087", "Yes, once shipped"],
      ],
    },
    steps: [
      ["Create it as a sample from the Orders tab.", "It gets an SMP- number and puts the product on hold."],
      ["Watch it in Orders → Samples.", "Each card lists exactly what's out and a TOTAL OUT weight."],
      ["When it comes back: enter the manifest and package number, press Returned.", "The hold releases back to inventory."],
      ["When they buy it: press Convert to Sale.", "It becomes a normal held order and takes its real invoice number now. The invoice still shows 'from sample SMP-0001', and either number finds it in search."],
    ],
    notes: [
      ["This is why invoice numbers have no gaps.", "A sample that returns never spent one."],
    ],
  },
  {
    id: "ship", roles: ["manager", "admin"], who: "Manager · Admin",
    title: "Shipping an order",
    lede: "Shipping is the moment inventory is deducted and the sale becomes revenue. It's a sign-off, not data entry.",
    steps: [
      ["Orders → Ship.", "Orders waiting to go out are listed here."],
      ["Enter the Metrc manifest number for the whole order."],
      ["Enter a Metrc package tag for every item.", "Every one. The button names anything still missing."],
      ["Mark Shipped.", "Inventory is deducted, the sale books, and your name is recorded against the shipment."],
      ["Print what goes on the box from Reprint Shipped Labels.", "Item Labels — one per pound plus the remainder, against the outgoing tags. Packing Slip — a header label plus one per strain with its full 24-character tag, so a box can be checked against the manifest without scanning."],
    ],
    notes: [
      ["A tag that isn't 24 characters warns but doesn't block.", "Usually a mis-scan or half a paste. Look at it before you carry on.", true],
      ["Sales reps and the Trimming Manager can't ship.", "They can fill in the manifest and tags so an Admin or Manager can finalise it — nothing they type is lost."],
    ],
  },
  {
    id: "invoices", roles: ["sales", "manager", "admin"], who: "Sales Rep · Manager · Admin",
    title: "Finding and fixing an invoice",
    lede: "Orders → Outgoing searches everything on an invoice, not just the number.",
    steps: [
      ["Type whatever you have in hand.", "Order number, customer, buyer, salesperson, manifest number, a Metrc tag off a box, a batch number, a strain, a date, or the amount."],
      ["Several words narrow rather than widen.", "“westside zours” finds Westside's invoices with Zours on them. Money matches on digits, so 16500, 16,500 and $16,500.00 all land on the same invoice. The last five characters of a tag are enough."],
      ["Open it and press Edit Invoice to change anything.", "Invoice number, order date, customer, line items, prices."],
      ["Add credits or discounts beneath the line items.", "Each gets a label the customer reads — “Volume discount”, “Credit — short weight on NG-1020”. Choose $ or %; a percent prints the dollars it came to."],
    ],
    notes: [
      ["The subtotal stays the value of the product at list price.", "Credits come off beneath it, and Total Due is what they owe — that's the figure reports, the dashboard and the payment blocks all use."],
      ["Strain # On/Off adds the strain number beside the name on that one invoice.", "Off by default, because numbers are internal. The setting sticks to the invoice, so a reprint months later matches the copy they already have."],
      ["If the app warns that a batch is billed on more than one invoice, stop and check.", "Each invoice reads correctly alone; a double-bill is only visible where they come back together. That warning is yours — it never prints on the customer's copy.", true],
    ],
  },
  {
    id: "reconcile", roles: ["manager", "admin"], who: "Manager · Admin",
    title: "Counting stock",
    lede: "The Reconcile tab is laid out the way you walk the building — facility, then room, then every harvest sitting in that room.",
    steps: [
      ["Reconcile.", "Collapse every room, then open the one you're standing in."],
      ["Count each batch and type what's there.", "A room holding three harvests shows three lines — separate batch numbers, separate tags, counted separately."],
      ["Watch the room variance in the room header as you go.", "Leave the room clean before you move on."],
      ["Add a reason on anything that differs.", "Shrinkage, count error, whatever it was."],
      ["Save Reconciliation.", "Only batches where your count differs are adjusted. Everything else is untouched."],
    ],
    notes: [],
  },
  {
    id: "admin", roles: ["admin"], who: "Admin only",
    title: "Settings that affect everyone",
    lede: "These change how documents read for the whole company. One of them is one-way.",
    table: {
      head: ["Where", "What it controls"],
      rows: [
        ["Admin → Settings", "Shipper name and licence on every label, ACH details per facility, next invoice numbers, menu password"],
        ["Admin → Rooms & Strains", "Room lists, the strain number → name map that labels and menus read, per-grade prices"],
        ["Admin → Team", "Approving new sign-ups, setting roles, removing access"],
        ["Admin → Backups", "Dated snapshots and restore"],
      ],
    },
    steps: [],
    notes: [
      ["Renumber All Invoices puts every invoice ever written into the current sequence, oldest first.", "Daddy's from NG-1001, MERC from MERC-10001. A backup is taken first. Invoices you've already sent will stop matching the customer's copy — each keeps its old number on the record, shown as “was NG153” and still findable by search, but anyone paying by invoice number needs telling. Samples are left alone. Run it once.", true],
    ],
  },
  {
    id: "printing", roles: ["trim", "intake", "sales", "manager", "admin"], who: "Everyone who prints",
    title: "When labels won't print",
    lede: "Work down this list. It's ordered by what actually goes wrong most often.",
    steps: [
      ["Read the red message in Stem.", "It says how many of how many printed and why the rest didn't. That usually names the problem outright."],
      ["Check the address in the browser.", "Browser Print only answers sites it's been told to accept. Set up for www.thestem.app but you're on thestem.app? It refuses — those are different sites to it."],
      ["Check Browser Print is running on that computer.", "The icon in the tray or menu bar."],
      ["Check the right printer is the default in Browser Print Settings.", "Over USB it's the printer's serial number; over the network it's an IP address."],
      ["Make the printer print by itself.", "A configuration label from its own panel proves whether the printer is fine and the problem is the connection."],
    ],
    notes: [
      ["Nothing is lost when a print fails.", "Labels can always be reprinted — ADMITTED — REPRINT LABELS for intake, Reprint Bin Labels for bins, Reprint Shipped Labels for outgoing."],
    ],
  },
];

// The reader's own role decides what opens first. A trimmer shouldn't have to know which of six
// filters is theirs.
function defaultRoleFor(profileRole) {
  if (profileRole === "trimmer") return "trim";
  if (profileRole === "sales") return "sales";
  if (profileRole === "manager") return "manager";
  if (profileRole === "admin") return "admin";
  return "all";
}

export default function Manual({ role, version }) {
  const [filter, setFilter] = useState(() => defaultRoleFor(role));
  const shown = SECTIONS.filter((s) => filter === "all" || s.roles.indexOf(filter) !== -1);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div style={S.headTop}>
          <BookOpen size={20} color="#C9A24B" />
          <div>
            <div style={S.title}>Floor Manual</div>
            <div style={S.sub}>How to do the job in Stem — trim through to the truck.</div>
          </div>
        </div>
        <div style={S.meta}>Written against v{version} · weights in grams · 454 g = 1 lb</div>
      </div>

      <div style={S.filterLabel}>Show procedures for</div>
      <div style={S.roles}>
        {ROLES.map((r) => (
          <button key={r.key} type="button" onClick={() => setFilter(r.key)}
            style={{ ...S.roleBtn, ...(filter === r.key ? S.roleBtnOn : null) }}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={S.count}>
        {shown.length} {shown.length === 1 ? "procedure" : "procedures"}
        {filter === "all" ? " · everything" : " for this role"}
      </div>

      <div style={S.rules}>
        <div style={S.rulesHead}>Rules that don't bend</div>
        <ol style={S.rulesList}>
          {HARD_RULES.map(([bold, rest]) => (
            <li key={bold} style={S.rulesItem}><b style={{ color: "#EDE8D8" }}>{bold}</b> {rest}</li>
          ))}
        </ol>
      </div>

      {shown.map((sec) => (
        <section key={sec.id} style={S.section}>
          <div style={S.secHead}>
            <div style={S.who}>{sec.who}</div>
            <h2 style={S.secTitle}>{sec.title}</h2>
            <div style={S.lede}>{sec.lede}</div>
          </div>

          {sec.table && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr>{sec.table.head.map((h) => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {sec.table.rows.map((row, i) => (
                    <tr key={i}>{row.map((cell, j) => (
                      <td key={j} style={{ ...S.td, ...(j === 1 && sec.id === "samples" ? S.mono : null) }}>{cell}</td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sec.steps.length > 0 && (
            <ol style={S.steps}>
              {sec.steps.map(([main, detail], i) => (
                <li key={i} style={S.step}>
                  <span style={S.stepNum}>{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.stepMain}>{main}</div>
                    {detail && <div style={S.stepDetail}>{detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {sec.notes.map(([bold, rest, warn], i) => (
            <div key={i} style={{ ...S.note, borderLeftColor: warn ? "#B9603F" : "#C9A24B" }}>
              {warn && <AlertTriangle size={13} color="#C97B63" style={{ flexShrink: 0, marginTop: 2 }} />}
              <span><b style={{ color: "#EDE8D8" }}>{bold}</b> {rest}</span>
            </div>
          ))}
        </section>
      ))}

      <div style={S.footer}>
        This manual lives inside Stem, so it changes when the app does. Something here wrong or missing? Tell Frank.
      </div>
    </div>
  );
}

const S = {
  wrap: { maxWidth: 780, margin: "0 auto" },
  head: { borderBottom: "2px solid #2A3324", paddingBottom: 16, marginBottom: 20 },
  headTop: { display: "flex", gap: 12, alignItems: "flex-start" },
  title: { fontSize: 24, fontWeight: 700, color: "#EDE8D8", letterSpacing: "-0.01em" },
  sub: { fontSize: 13, color: "#8C9483", marginTop: 3 },
  meta: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#7C8571", marginTop: 12 },

  filterLabel: { fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7C8571", marginBottom: 8 },
  roles: { display: "flex", gap: 6, flexWrap: "wrap" },
  roleBtn: { fontSize: 12.5, fontWeight: 600, padding: "7px 13px", border: "1px solid #2A3324", background: "transparent", color: "#8C9483", borderRadius: 4, cursor: "pointer" },
  roleBtnOn: { background: "#C9A24B", color: "#12160F", borderColor: "#C9A24B" },
  count: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: "#7C8571", marginTop: 10 },

  rules: { border: "2px solid #B9603F", background: "rgba(185,96,63,0.07)", borderRadius: 8, padding: "16px 18px", margin: "22px 0 8px" },
  rulesHead: { fontSize: 12, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#C97B63", marginBottom: 12 },
  rulesList: { margin: 0, paddingLeft: "1.1em", color: "#B9BFA9", fontSize: 13.5, lineHeight: 1.6 },
  rulesItem: { marginBottom: 8 },

  section: { marginTop: 36 },
  secHead: { borderBottom: "1px solid #2A3324", paddingBottom: 10, marginBottom: 18 },
  who: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C9A24B", marginBottom: 5 },
  secTitle: { fontSize: 19, fontWeight: 700, color: "#EDE8D8", margin: 0, letterSpacing: "-0.01em" },
  lede: { fontSize: 13.5, color: "#8C9483", marginTop: 7, lineHeight: 1.55 },

  steps: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 },
  step: { display: "flex", gap: 12, alignItems: "flex-start" },
  stepNum: { flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: "1px solid #2A3324", color: "#C9A24B", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepMain: { fontSize: 14, color: "#EDE8D8", lineHeight: 1.5 },
  stepDetail: { fontSize: 13, color: "#8C9483", marginTop: 4, lineHeight: 1.55 },

  note: { display: "flex", gap: 8, alignItems: "flex-start", borderLeft: "3px solid #C9A24B", padding: "9px 0 9px 13px", marginTop: 14, fontSize: 13, color: "#8C9483", lineHeight: 1.55 },

  tableWrap: { overflowX: "auto", marginBottom: 18 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7C8571", fontWeight: 400, borderBottom: "1px solid #2A3324", padding: "7px 12px 7px 0" },
  td: { borderBottom: "1px solid #2A3324", padding: "9px 12px 9px 0", color: "#B9BFA9", verticalAlign: "top" },
  mono: { fontFamily: "'IBM Plex Mono', monospace", color: "#EDE8D8" },

  footer: { borderTop: "1px solid #2A3324", marginTop: 44, paddingTop: 16, fontSize: 12.5, color: "#7C8571" },
};
