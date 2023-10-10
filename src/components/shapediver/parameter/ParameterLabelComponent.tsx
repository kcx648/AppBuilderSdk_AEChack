import { Text } from "@mantine/core";
import React, { JSX } from "react";
import { useShapediverStoreParameters } from "store/parameterStore";
import { PropsParameter } from "types/components/shapediver/propsParameter";
import { ISdReactParameter } from "types/shapediver/parameter";

/**
 * Functional component that creates a label for a parameter or .
 * It displays a Skeleton if the session is not accessible yet.
 *
 * @returns
 */
export default function ParameterLabelComponent(props: PropsParameter): JSX.Element {
	const { sessionId, parameterId } = props;
	const parametersStore = useShapediverStoreParameters();
	const { definition } = parametersStore.useParameter(sessionId, parameterId)(state => state as ISdReactParameter<any>);
	
	return <Text style={{ paddingBottom: "0.25rem" }} size="sm" fw={500}>{definition.displayname || definition.name}</Text>;
}
