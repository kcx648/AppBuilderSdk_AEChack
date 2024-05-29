import useAsync from "../../misc/useAsync";
import { IAppBuilderSettings } from "types/shapediver/appbuilder";
import { SdPlatformModelGetEmbeddableFields, SdPlatformSdk, create, isPBInvalidRequestOAuthResponseError } from "@shapediver/sdk.platform-api-sdk-v1";
import { useRef } from "react";
import { getDefaultPlatformUrl, isRunningInPlatform } from "utils/shapediver";

const DEFAULT_PLATFORM_CLIENT_ID = "920794fa-245a-487d-8abe-af569a97da42";

/**
 * In case the session settings contain a slug and a platformUrl, 
 * resolve the ticket, modelViewUrl and token from the platform.
 */
export default function useResolveAppBuilderSettings(settings : IAppBuilderSettings|undefined) {

	const platformSdkRef = useRef<SdPlatformSdk>();

	// when running on the platform, try to get a token (refresh token grant)
	const { value: tokenResult } = useAsync(async () => {
		if (!isRunningInPlatform()) return;
		const platformUrl = getDefaultPlatformUrl();
		const client = create({ clientId: DEFAULT_PLATFORM_CLIENT_ID, baseUrl: platformUrl });
		platformSdkRef.current = client;
		try {
			const result = await client.authorization.refreshToken();
	
			return {
				jwtToken: result.access_token,
				platformUrl
			};
		} catch (error) {
			if (isPBInvalidRequestOAuthResponseError(error)) {
				if (window.location.origin === "https://shapediver.com") {
					// redirect to www.shapediver.com, because 3rd party auth requires it
					window.location.href = `https://www.shapediver.com${window.location.pathname}${window.location.search}`;
				}
				else {
					// redirect to platform login
					window.location.href = `${platformUrl}/app/login?redirect=${window.location.origin}${window.location.pathname}${window.location.search}`;
				}
			}

			return { platformUrl };
		}
	});

	// resolve session data using iframe embedding or token
	const { value, error, loading } = useAsync(async () => {
		if (isRunningInPlatform() && !tokenResult) return;
		if (!settings) return;
		
		const sessions = await Promise.all(settings.sessions.map(async session => {
			if (!session.slug || !session.platformUrl)
				return session;
			
			// in case we are running on the platform and the session is on the same platform,
			// use a model get call to get ticket, modelViewUrl and token
			if (isRunningInPlatform() && tokenResult?.platformUrl === session.platformUrl) {
				const result = await platformSdkRef.current?.models.get(session.slug, [
					SdPlatformModelGetEmbeddableFields.BackendSystem,
					SdPlatformModelGetEmbeddableFields.Ticket,
					SdPlatformModelGetEmbeddableFields.TokenExportFallback,
				]);
				const model = result?.data;
				document.title = `${model?.title ?? model?.slug} | ShapeDiver App Builder`;
			
				return {
					...session, 
					ticket: model!.ticket!.ticket,
					modelViewUrl: model!.backend_system!.model_view_url,
					jwtToken: model?.access_token
				};
			}
			// otherwise try to use iframe embedding
			else {
				const client = create({ clientId: DEFAULT_PLATFORM_CLIENT_ID, baseUrl: session.platformUrl });
				const result = await client.models.iframeEmbedding(session.slug);
				const iframeData = result.data;

				return {
					...session, 
					ticket: iframeData.ticket,
					modelViewUrl: iframeData.model_view_url,
					jwtToken: iframeData.token
				};
			}
		}));

		const settingsResolved: IAppBuilderSettings = { 
			...settings, 
			sessions, 
			auth: tokenResult
		};

		return settingsResolved;
	}, [settings, tokenResult]);

	return {
		settings: value, 
		error, 
		loading
	};
}