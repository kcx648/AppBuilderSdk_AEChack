import React, { useEffect, useRef, useState, JSX } from "react";
import { useShapediverViewerStore } from "../../context/shapediverViewerStore";
import { PARAMETER_TYPE } from "@shapediver/viewer";
import { Accordion, Divider, Loader, MediaQuery, ScrollArea, useMantineTheme } from "@mantine/core";
import ParameterSliderComponent from "./parameter/ParameterSliderComponent";
import ParameterBooleanComponent from "./parameter/ParameterBooleanComponent";
import ParameterStringComponent from "./parameter/ParameterStringComponent";
import ParameterColorComponent from "./parameter/ParameterColorComponent";
import ParameterSelectComponent from "./parameter/ParameterSelectComponent";
import ParameterLabelComponent from "./parameter/ParameterLabelComponent";
import ParameterFileInputComponent from "./parameter/ParameterFileInputComponent";

interface Props {
    // The unique identifier to use to access the session.
    sessionId: string
}

/**
 * Functional component that create a parameter UI for the session which id was provided.
 *
 * First, the resolve of the session promise is awaited after which the UI elements are created.
 * Elements that are specified as "hidden" will be skipped.
 *
 * The grouping is done via the "group" property and the order of the elements is done via the "order" property.
 *
 * @returns
 */
export default function ParameterUiComponent({ sessionId }: Props): JSX.Element {
	const theme = useMantineTheme();
	const activeSessionsRef = useRef(useShapediverViewerStore.getState().activeSessions);
	const [loading, setLoading] = useState(true);
	const [element, setElement] = useState(<></>);

	const parameterComponentsMap = {
		[PARAMETER_TYPE.INT]: ParameterSliderComponent,
		[PARAMETER_TYPE.FLOAT]: ParameterSliderComponent,
		[PARAMETER_TYPE.EVEN]: ParameterSliderComponent,
		[PARAMETER_TYPE.ODD]: ParameterSliderComponent,
		[PARAMETER_TYPE.BOOL]: ParameterBooleanComponent,
		[PARAMETER_TYPE.STRING]: ParameterStringComponent,
		[PARAMETER_TYPE.STRINGLIST]: ParameterSelectComponent,
		[PARAMETER_TYPE.COLOR]: ParameterColorComponent,
		[PARAMETER_TYPE.FILE]: ParameterFileInputComponent,
	};

	useEffect(() => {
		const createParameterUi = () => {
			// search for the session with the specified id in the active sessions
			const activeSessions = activeSessionsRef.current;
			const session = activeSessions[sessionId];

			// activate the loading to show the Loader
			setLoading(true);

			if (!session) return;

			// deactivate the loading mode
			setLoading(false);

			// create a data structure to store the elements within their groups
			const elementGroups: {
                    [key: string]: {
                        group: { id: string, name: string }
                        elements: JSX.Element[],
                    }
                } = {};

			// sort the parameters
			const parameters = Object.values(session.parameters);
			parameters.sort((a, b) => (a.order || Infinity) - (b.order || Infinity));

			// loop through the parameters and store the created elements in the elementGroups
			for (let i = 0; i < parameters.length; i++) {
				const param = parameters[i];

				// if a parameter is hidden, skip it
				if (param.hidden) continue;

				// read out the group or specify a new one if none has been provided
				const group = param.group || { id: "default", name: "Parameter Group" };
				if (!elementGroups[group.id]) {
					elementGroups[group.id] = {
						group,
						elements: []
					};
				}

				const type = param.type as keyof typeof parameterComponentsMap;
				const ParameterComponent = parameterComponentsMap[type] || ParameterLabelComponent;
				// Get the element for the parameter and add it to the group
				elementGroups[group.id].elements.push(<div key={param.id}><ParameterComponent
					parameterId={param.id}
					sessionId={sessionId}
				/></div>);
			}

			const elements: JSX.Element[] = [];

			// loop through the created elementGroups to add them
			for (const e in elementGroups) {
				const g = elementGroups[e];

				// add dividers between the elements
				const groupElements: JSX.Element[] = [];
				g.elements.forEach((element, index) => {
					groupElements.push(element);
					if (index !== g.elements.length - 1) groupElements.push(<Divider key={element.key + "_divider"} my="sm" />);
				});

				// create an Accordion.Item for each element
				elements.push(
					<Accordion.Item key={g.group.id} value={g.group.id}>
						<Accordion.Control>{g.group.name}</Accordion.Control>
						<Accordion.Panel
							key={g.group.id}
							style={{ background: theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.colors.gray[0] }}
						>
							{groupElements}
						</Accordion.Panel>
					</Accordion.Item>
				);
			}

			// finally, set the element
			setElement(
				<MediaQuery smallerThan="sm" styles={{
					// minus tab height (34) and two times margin (2 x 10)
					height: "calc(300px - 54px)"
				}}>
					<ScrollArea type="auto">
						<Accordion variant="contained" radius="md">
							{elements}
						</Accordion>
					</ScrollArea>
				</MediaQuery>
			);
		};

		const unsubscribe = useShapediverViewerStore.subscribe(state => {
			activeSessionsRef.current = state.activeSessions;
			createParameterUi();
		});

		createParameterUi();

		return () => {
			unsubscribe();
		};
	}, [sessionId, theme]);

	return (
		<>
			{loading && <Loader style={{ width: "100%" }} mt="xl" size="xl" variant="dots" />}
			{!loading && element}
		</>
	);
}
