import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TodoResponseDTO } from '../../../../src/application/dto/TodoDTO';
import { TodoItem } from '../../../../src/presentation/components/TodoItem';

// Mock SubtaskList to simplify testing TodoItem
jest.mock('../../../../src/presentation/components/SubtaskList', () => ({
  SubtaskList: ({ subtasks, onToggleSubtask, onDeleteSubtask }: any) => (
    <div data-testid="subtask-list">
      {subtasks.map((s: any) => (
        <div key={s.id} data-testid={`subtask-${s.id}`}>
          {s.title}
          <button onClick={() => onToggleSubtask(s.id)}>Toggle Subtask</button>
          <button onClick={() => onDeleteSubtask(s.id)}>Delete Subtask</button>
        </div>
      ))}
    </div>
  ),
}));

describe('TodoItem Component', () => {
  const mockTodo: TodoResponseDTO = {
    id: '1',
    title: 'Test Todo',
    completed: false,
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    subtasks: [
      { id: 's1', title: 'Subtask 1', completed: false },
      { id: 's2', title: 'Subtask 2', completed: true },
    ],
  };

  const mockOnAddSubtask = jest.fn();
  const mockOnToggleSubtask = jest.fn();
  const mockOnDeleteSubtask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders todo title', () => {
    render(<TodoItem todo={mockTodo} />);
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
  });

  it('toggles expansion when expand button is clicked', () => {
    render(<TodoItem todo={mockTodo} />);
    
    // Initially subtasks should not be visible (assuming default is collapsed)
    // But wait, the component state might default to collapsed.
    // Let's check if SubtaskList is visible.
    expect(screen.queryByTestId('subtask-list')).not.toBeInTheDocument();

    const expandBtn = screen.getByLabelText('Expand subtasks');
    fireEvent.click(expandBtn);

    expect(screen.getByTestId('subtask-list')).toBeInTheDocument();
  });

  it('renders subtasks when expanded', () => {
    render(
      <TodoItem
        todo={mockTodo}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    const expandBtn = screen.getByLabelText('Expand subtasks');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtask 2')).toBeInTheDocument();
  });

  it('calls onToggleSubtask when subtask toggle is clicked', () => {
    render(
      <TodoItem
        todo={mockTodo}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    fireEvent.click(screen.getByLabelText('Expand subtasks'));
    
    const toggleBtn = screen.getAllByText('Toggle Subtask')[0];
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn!);

    expect(mockOnToggleSubtask).toHaveBeenCalledWith('1', 's1');
  });

  it('calls onDeleteSubtask when subtask delete is clicked', () => {
    render(
      <TodoItem
        todo={mockTodo}
        onToggleSubtask={mockOnToggleSubtask}
        onDeleteSubtask={mockOnDeleteSubtask}
      />
    );

    fireEvent.click(screen.getByLabelText('Expand subtasks'));
    
    const deleteBtn = screen.getAllByText('Delete Subtask')[0];
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn!);

    expect(mockOnDeleteSubtask).toHaveBeenCalledWith('1', 's1');
  });

  it('shows add subtask form when expanded', () => {
    render(
      <TodoItem
        todo={mockTodo}
        onAddSubtask={mockOnAddSubtask}
      />
    );

    // Expand first
    fireEvent.click(screen.getByLabelText('Expand subtasks'));

    // Click add subtask button
    fireEvent.click(screen.getByLabelText('Add subtask'));

    expect(screen.getByPlaceholderText('Subtask title')).toBeInTheDocument();
  });

  it('calls onAddSubtask when form is submitted', async () => {
    render(
      <TodoItem
        todo={mockTodo}
        onAddSubtask={mockOnAddSubtask}
      />
    );

    fireEvent.click(screen.getByLabelText('Expand subtasks'));
    fireEvent.click(screen.getByLabelText('Add subtask'));

    const input = screen.getByPlaceholderText('Subtask title');
    fireEvent.change(input, { target: { value: 'New Subtask' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockOnAddSubtask).toHaveBeenCalledWith('1', 'New Subtask');
    });
  });
});
