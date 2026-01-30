import React, { useState } from 'react';
import { FilterableSelect } from '@/components/ui/FilterableSelect';

// Example usage component
export const FilterableSelectExample: React.FC = () => {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const sampleOptions = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'date', label: 'Date' },
    { value: 'elderberry', label: 'Elderberry' },
    { value: 'fig', label: 'Fig' },
    { value: 'grape', label: 'Grape' },
    { value: 'honeydew', label: 'Honeydew' },
    { value: 'kiwi', label: 'Kiwi' },
    { value: 'lemon', label: 'Lemon' },
    { value: 'mango', label: 'Mango' },
    { value: 'orange', label: 'Orange' },
    { value: 'papaya', label: 'Papaya' },
    { value: 'quince', label: 'Quince' },
    { value: 'raspberry', label: 'Raspberry' },
  ];

  return (
    <div className="p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Filterable Select Example
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Choose a fruit:
          </label>
          <FilterableSelect
            value={selectedValue}
            onValueChange={setSelectedValue}
            options={sampleOptions}
            placeholder="Select a fruit..."
            searchPlaceholder="Type to search fruits..."
            emptyMessage="No fruits found"
            className="w-full"
          />
        </div>

        {selectedValue && (
          <div className="p-3 bg-gray-800 rounded-md">
            <p className="text-sm text-gray-300">
              Selected:{' '}
              <span className="text-white font-medium">
                {
                  sampleOptions.find((opt) => opt.value === selectedValue)
                    ?.label
                }
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
