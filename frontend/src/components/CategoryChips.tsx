'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Category } from '@/types';

interface Props {
  selectedCategory: string;
  onSelect: (cat: string) => void;
  multiSelect?: boolean;
  selectedCategories?: string[];
  onMultiSelect?: (cats: string[]) => void;
  type?: 'EXPENSE' | 'INCOME' | '';
}

export default function CategoryChips({ selectedCategory, onSelect, multiSelect, selectedCategories = [], onMultiSelect, type = '' }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [newCatColor, setNewCatColor] = useState('#8b5cf6');
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.getCategories(type ? { type } : undefined);
      if (Array.isArray(data)) {
        const seen = new Set<string>();
        const unique = data.filter(cat => {
          const key = cat.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCategories(unique);
      }
    } catch {}
  }, [type]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleChipClick = (name: string) => {
    if (multiSelect && onMultiSelect) {
      const next = selectedCategories.includes(name)
        ? selectedCategories.filter(c => c !== name)
        : [...selectedCategories, name];
      onMultiSelect(next);
    } else {
      onSelect(name);
    }
  };

  const isSelected = (name: string) =>
    multiSelect ? selectedCategories.includes(name) : selectedCategory === name;

  const handleAddCustom = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    try {
      const created = await api.createCategory({
        name: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
        type: type || 'EXPENSE'
      });
      if (created._id) {
        setCategories(prev => [...prev, created]);
        onSelect(created.name);
        setShowCustomInput(false);
        setNewCatName('');
      }
    } catch {}
    setLoading(false);
  };

  const handleDeleteCustom = async (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.is_default) return;
    try {
      await api.deleteCategory(cat._id);
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch {}
  };

  return (
    <div>
      <div className="chips-container">
        {categories.map(cat => (
          <div
            key={cat._id}
            className={`chip${isSelected(cat.name) ? ' selected' : ''}`}
            style={isSelected(cat.name) ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            onClick={() => handleChipClick(cat.name)}
            title={cat.name}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            {!cat.is_default && (
              <span
                onClick={(e) => handleDeleteCustom(cat, e)}
                style={{ marginLeft: 4, opacity: 0.6, fontSize: 10, cursor: 'pointer' }}
                title="Delete"
              >✕</span>
            )}
          </div>
        ))}

        {/* Add custom chip */}
        <div className="chip chip-add" onClick={() => setShowCustomInput(true)} title="Add custom category">
          <span>+</span>
          <span>Custom</span>
        </div>
      </div>

      {/* Custom category input */}
      {showCustomInput && (
        <div style={{
          marginTop: 12,
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter category name..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: 160 }}
              onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              autoFocus
            />
            <input
              type="text"
              placeholder="Icon"
              value={newCatIcon}
              onChange={e => setNewCatIcon(e.target.value)}
              className="form-input"
              style={{ width: 60, textAlign: 'center', fontSize: 20 }}
            />
            <input
              type="color"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
              style={{ width: 40, height: 38, padding: 2, background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
              title="Pick color"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddCustom} disabled={loading}>
              {loading ? '...' : '✓ Add'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowCustomInput(false); setNewCatName(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
