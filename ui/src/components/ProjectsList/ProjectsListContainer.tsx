import React from "react";
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  Droppable,
  DroppableProvided,
  DropResult
} from "react-beautiful-dnd";
import { reorderProjectsInDb } from "../shared/API";
import { useConfig } from "../shared/stores/ConfigStore";
import { useJobs } from "../shared/stores/JobStore";
import { useProjects } from "../shared/stores/ProjectStore";
import { Container } from "./styles";
import ProjectItem from "./ProjectItem";

interface IProjectsListContainerProps {}

const getRunningTasksCountForProjects = (
  projects: IProject[],
  runningTasks: any
) => {
  const taskCount = {};

  projects.forEach((project: IProject) => {
    const { commands, _id } = project;
    let runningCount: number = 0;
    commands.forEach((command: IProjectCommand) => {
      const { _id } = command;
      if (runningTasks[_id]) {
        runningCount++;
      }
    });
    taskCount[_id!] = runningCount;
  });

  return taskCount;
};

const ProjectsListContainer: React.FC<IProjectsListContainerProps> = () => {
  const {
    projects: tempProjects,
    setActiveProject,
    activeProject
  } = useProjects();
  const { runningTasks } = useJobs();
  /* tslint:disable-next-line */
  const [_, setSelectedItemIndex] = React.useState<number>(0);
  const [projects, setProjects] = React.useState<any>([]);
  const [
    activeProjectIndexBeforeDrag,
    setActiveProjectIndexBeforeDrag
  ] = React.useState<number>(0);
  const [projectRunningTaskCount, setProjectRunningTaskCount] = React.useState<
    any
  >({});
  const { config } = useConfig();

  React.useEffect(() => {
    if (!tempProjects) {
      return;
    }

    setProjects(tempProjects);
  }, [tempProjects]);

  React.useEffect(() => {
    if (!projects) {
      return;
    }

    const taskCountMap = getRunningTasksCountForProjects(
      projects,
      runningTasks
    );

    setProjectRunningTaskCount(taskCountMap);
  }, [runningTasks, projects]);

  const changeActiveProject = React.useCallback(
    (projectId, index: number) => {
      const activeProjectWithId = projects.find(
        project => project._id === projectId
      );
      if (activeProjectWithId) {
        setActiveProject(activeProjectWithId);

        setSelectedItemIndex(index);
      } else {
        setActiveProject({
          _id: "",
          name: "",
          type: "",
          path: "",
          commands: []
        });
      }
    },
    [projects, setActiveProject]
  );

  const updateActiveProjectIndex = () => {
    // Save Index of active project before.
    // So that, we can move animated blue background only if active project changed position.
    const newProjects = [...projects];
    const activeProjectIndex: number =
      newProjects.findIndex(x => x._id === activeProject._id) || 0;

    setActiveProjectIndexBeforeDrag(activeProjectIndex);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    const newProjects = [...projects];
    const newActiveProjectIndex: number = newProjects.findIndex(
      x => x._id === activeProject._id
    );
    if (activeProjectIndexBeforeDrag !== newActiveProjectIndex) {
      setSelectedItemIndex(newActiveProjectIndex);
    }

    updateActiveProjectIndex();
  }, [activeProject, projects]);

  const saveNewProjectsOrder = React.useCallback(
    (projects: IProject[]) => {
      const save = async (projects: IProject[]) => {
        try {
          console.info("Saving new projects order");
          const projectIds = projects.map(project => project._id!);
          await reorderProjectsInDb(config, projectIds);
          setProjects(projects);
        } catch (error) {
          console.log("Error Reordering:", error);
        }
      };
      save(projects);
    },
    [projects, config]
  );

  const onDragStart = () => {
    updateActiveProjectIndex();
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newProjects = [...projects];

    const sourceProject = newProjects[source.index];
    newProjects.splice(source.index, 1);
    newProjects.splice(destination.index, 0, sourceProject);

    setProjects(newProjects);
    saveNewProjectsOrder(newProjects);

    // Check if activeProject is moved
    const activeProjectIndexAfterDrag: number = newProjects.findIndex(
      x => x._id === activeProject._id
    );
    console.log("activeProjectIndexBeforeDrag:", activeProjectIndexBeforeDrag);
    console.log("activeProjectIndexAfterDrag:", activeProjectIndexAfterDrag);
    if (activeProjectIndexBeforeDrag !== activeProjectIndexAfterDrag) {
      setSelectedItemIndex(activeProjectIndexAfterDrag);
    }
  };

  if (!projects || projects.length === 0) {
    return <div />;
  }

  return (
    <React.Fragment>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <Droppable droppableId={"project-list-droppable"}>
          {(droppableProvided: DroppableProvided) => (
            <Container
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
            >
              {/* <TabSwitchAnimator
                style={{
                  transform: `translateY(${selectedItemIndex * 40}px)`
                }}
              /> */}
              {projects.map((project: IProject, index: number) => {
                return (
                  <Draggable
                    draggableId={project._id!}
                    index={index}
                    key={project._id}
                  >
                    {(draggableProvided: DraggableProvided) => (
                      <ProjectItem
                        project={project}
                        draggableProvided={draggableProvided}
                        changeActiveProject={changeActiveProject}
                        itemIndex={index}
                        projectRunningTaskCount={projectRunningTaskCount}
                      />
                    )}
                  </Draggable>
                );
              })}
              {droppableProvided.placeholder}
            </Container>
          )}
        </Droppable>
      </DragDropContext>
    </React.Fragment>
  );
};

export default ProjectsListContainer;
