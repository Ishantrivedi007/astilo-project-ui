import React, { useState } from "react";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Toast } from "primereact/toast";

const TodoList = () => {
  const [newTask, setNewTask] = useState("");
  const [tasks, setTasks] = useState([]);

  const addTask = () => {
    if (newTask.trim() !== "") {
      setTasks([...tasks, { text: newTask, completed: false }]);
      setNewTask("");
    } else {
      toast.current.show({
        severity: "warn",
        summary: "Warning",
        detail: "Please enter a task!",
      });
    }
  };

  const handleTaskChange = (index, event) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].completed = event.checked;
    setTasks(updatedTasks);
  };

  const handleDelete = (index) => {
    const updatedTasks = [...tasks];
    updatedTasks.splice(index, 1);
    setTasks(updatedTasks);
  };

  const toast = React.useRef(null);

  return (
    <Card className="todo-card p-shadow-4 rounded-xl">
      <Toast ref={toast} />

      <div className="todo-list-container">
        <h2>Todo List</h2>
        <div className="input-container">
          <InputText
            className="todo-input"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Enter a new task"
          />
          <Button
            className="p-button-raised p-button-rounded"
            label="Add Task"
            onClick={addTask}
          />
        </div>
        {tasks.map((task, index) => (
          <div
            key={index}
            className="task-container  !justify-center !items-center"
          >
            <Checkbox
              checked={task.completed}
              onChange={(e) => handleTaskChange(index, e)}
            />
            <span
              className={`task-text ${task.completed ? "completed-task" : ""}`}
            >
              {task.text}
            </span>
            <Button
              className="p-button-text p-ml-auto"
              label="Delete"
              icon="pi pi-trash"
              onClick={() => handleDelete(index)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TodoList;
