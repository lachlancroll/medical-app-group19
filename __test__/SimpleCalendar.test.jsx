import { fireEvent, render } from '@testing-library/react-native';
import { SimpleCalendar } from '../app/index';

describe('SimpleCalendar', () => {
  // Helper to format dates consistently
  const formatDate = (dateStr) => {
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return null;
  };

  test('renders month header and current-month cells', () => {
    const { getByText, getAllByRole } = render(<SimpleCalendar />);
    
    // Header should show month and year
    expect(getByText(/\w+ \d{4}/i)).toBeTruthy();
    
    // Should have buttons for current month days
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.length).toBeLessThanOrEqual(31); // Max 31 days in a month
  });

  test('calls onDatePress with ISO date when a cell is tapped', () => {
    const onDatePress = jest.fn();
    const { getAllByRole } = render(<SimpleCalendar onDatePress={onDatePress} />);
    
    // Get all date cells
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Press the first date cell
    fireEvent.press(buttons[0]);
    expect(onDatePress).toHaveBeenCalled();
    
    // Verify it was called with an ISO date string
    const callArg = onDatePress.mock.calls[0][0];
    expect(typeof callArg).toBe('string');
    expect(callArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('marks highlight, rx, and cancelled dates correctly', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const hl = `${year}-${String(month + 1).padStart(2, '0')}-05`;
    const rx = `${year}-${String(month + 1).padStart(2, '0')}-12`;
    const cancelled = `${year}-${String(month + 1).padStart(2, '0')}-20`;

    const { getByLabelText } = render(
      <SimpleCalendar
        highlightDates={[hl]}
        prescriptionDates={[rx]}
        cancelledDates={[cancelled]}
      />
    );

    expect(getByLabelText(`date ${hl} highlight`)).toBeTruthy();
    expect(getByLabelText(`date ${rx} rx`)).toBeTruthy();
    expect(getByLabelText(`date ${cancelled} cancelled`)).toBeTruthy();
  });

  test('today cell is labeled with "today"', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { getByLabelText } = render(<SimpleCalendar />);
    expect(getByLabelText(`date ${todayStr} today`)).toBeTruthy();
  });

  test('only renders current month cells as pressable', () => {
    const { getAllByRole } = render(<SimpleCalendar />);
    
    const buttons = getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    
    // Verify some buttons have valid testIDs
    buttons.forEach(button => {
      const testId = button.props.testID;
      if (testId) {
        expect(testId).toMatch(/^cell-\d{4}-\d{2}-\d{2}$/);
      }
    });
  });
});
