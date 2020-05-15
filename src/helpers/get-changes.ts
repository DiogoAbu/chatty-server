interface RequiredProps {
  id?: string;
  isDeleted?: boolean;
}

export default <T extends RequiredProps>(
  arr: T[],
): {
  created: T[];
  updated: T[];
  deleted: string[];
} => {
  const created: T[] = [];
  const deleted: string[] = [];

  // Remove deleted elements and add them to another array
  const updated = arr.filter((each) => {
    if (each?.isDeleted && each?.id) {
      deleted.push(each.id);
    }
    return !each?.isDeleted;
  });

  return { created, updated, deleted };
};
