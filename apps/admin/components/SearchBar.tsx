export function SearchBar({ placeholder, defaultValue }: { placeholder: string; defaultValue?: string }) {
  return (
    <form className="mb-6">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="admin-input w-full max-w-md"
      />
    </form>
  );
}
