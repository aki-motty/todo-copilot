import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SubtaskDTO } from '../../../../src/application/dto/TodoDTO';
import { SubtaskList } from '../../../../src/presentation/components/SubtaskList';

describe('SubtaskList Component', () => {
  const mockSubtasks: SubtaskDTO[] = [
    { id: '1', title: 'Subtask 1', completed: false },
    { id: '2', title: 'Subtask 2', completed: true },
  ];

  const mockOnToggleSubtask = jest.fn();
  const mockOnDeleteSubtask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of subtasks', () => {
    render(
      <SubtaskList
        subtasks={mockSubtasks}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });

  it('calls onToggleSubtask when a checkbox is clicked', () => {
    render(
      <SubtaskList
        subtasks={mockSubtasks}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Ensure checkboxes exist before clicking
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]!);

    expect(mockOnToggleSubtask).toHaveBeenCalledWith('1');
  });

  it('calls onDeleteSubtask when a delete button is clicked', () => {
    render(
      <SubtaskList
        subtasks={mockSubtasks}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete subtask/i });
    // Ensure buttons exist before clicking
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]!);

    expect(mockOnDeleteSubtask).toHaveBeenCalledWith('1');
  });

  it('renders completed subtasks with correct styling', () => {
    render(
      <SubtaskList
        subtasks={mockSubtasks}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    const completedSubtask = screen.getByText('Subtask 2');
    expect(completedSubtask).toHaveClass('completed');
  });
});
