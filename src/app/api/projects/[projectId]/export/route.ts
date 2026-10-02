import { NextResponse } from "next/server";
import { GenerationError } from "../../../../../core/generation/errors";
import { isGenerationAuthFailure } from "../../../../../server/application/generation-flow";
import { PersistenceError } from "../../../../../server/persistence/errors";
import { parseExportTargets, zipContentDisposition } from "../../../../../server/export/zip";
import { getGenerationFlow } from "../../../../../server/runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const targets = parseExportTargets(
    new URL(request.url).searchParams.get("targets"),
  );

  try {
    const exported = await getGenerationFlow().exportZip({
      projectId,
      targets,
    });

    return new NextResponse(Buffer.from(exported.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": zipContentDisposition(exported.filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isGenerationAuthFailure(error)) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (error instanceof PersistenceError && error.code === "NOT_FOUND") {
      return new NextResponse("Not found", { status: 404 });
    }

    if (error instanceof GenerationError && error.code === "GENERATION_NOT_READY") {
      return new NextResponse("Project is not ready for generation.", {
        status: 409,
      });
    }

    return new NextResponse("Export failed.", { status: 400 });
  }
}
