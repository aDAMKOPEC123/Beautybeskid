// Czyste reguły blokad — bez Prismy, bez sieci. Testowalne jednostkowo.

export interface BlockLike {
  startsAt: Date;
  endsAt: Date;
  appliesToAll: boolean;
  employees: { id: string }[];
}

export function blockAppliesToEmployee(block: BlockLike, employeeId: string): boolean {
  if (block.appliesToAll) return true;
  return block.employees.some((e) => e.id === employeeId);
}

export function isSlotBlocked(
  slotStart: Date,
  slotEnd: Date,
  employeeId: string,
  blocks: BlockLike[],
): boolean {
  return blocks.some(
    (b) =>
      blockAppliesToEmployee(b, employeeId) &&
      slotStart < b.endsAt &&
      slotEnd > b.startsAt,
  );
}
