import { FolderIcon, AltArrowDownIcon, AddFolderIcon } from '@solar-icons/react/bold'
import { useLibrary } from '../lib/library.jsx'
import { useConfirm } from '../lib/confirm.jsx'

const NEW = '__new'

// native select on purpose: phones show their own picker (ios wheel / android list)
export default function FolderSelect({ value, onChange, label = 'save to' }) {
  const { folderOptions, getFolder, createFolder } = useLibrary()
  const ask = useConfirm()
  const options = folderOptions()
  const current = value && getFolder(value) ? value : ''

  const pick = async (v) => {
    if (v !== NEW) return onChange(v || null)
    const name = await ask({ title: 'new course', input: { placeholder: 'e.g. bs psychology' }, ok: 'create', Icon: AddFolderIcon })
    if (name) onChange(createFolder(name, null))
  }

  return (
    <label className="folder-select">
      <FolderIcon size={20} />
      <span className="folder-select-label">{label}</span>
      <select value={current} onChange={(e) => pick(e.target.value)}>
        <option value="">unsorted</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        <option value={NEW}>+ new course…</option>
      </select>
      <AltArrowDownIcon size={18} className="folder-select-caret" />
    </label>
  )
}
