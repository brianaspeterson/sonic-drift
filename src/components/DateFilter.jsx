const MONTHS = [
  { value: '', label: 'Any month' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 1960 to current year
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [{ value: '', label: 'Any year' }];
  for (let y = currentYear; y >= 1960; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

const YEARS = getYears();

export function DateFilter({ month, year, onMonthChange, onYearChange, disabled }) {
  return (
    <div className="date-filter">
      <label className="date-filter-label">Release period</label>
      <div className="date-filter-selects">
        <select
          className="date-select"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          disabled={disabled}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          className="date-select"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          disabled={disabled}
        >
          {YEARS.map((y) => (
            <option key={y.value} value={y.value}>
              {y.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

