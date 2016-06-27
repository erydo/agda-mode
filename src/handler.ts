import * as _ from "lodash";
import { Agda, View } from "./types";
import Core from "./core";

function handleAgdaResponse(core: Core, response: Agda.Response) {
    switch (response.type) {
        case Agda.ResponseType.InfoAction:
            handleInfoAction(core, <Agda.InfoAction>response);
            break;

        case Agda.ResponseType.StatusAction:
            let status = <Agda.StatusAction>response;
            if (status.content.length !== 0) {
                core.view.set("Status", status.content);
            }
            break;

        case Agda.ResponseType.GoalsAction:
            let goals = (<Agda.GoalsAction>response).content;
            core.textBuffer.onGoalsAction(goals);
            break;

        case Agda.ResponseType.GiveAction:
            let give = <Agda.GiveAction>response;
            core.textBuffer.onGiveAction(give.index, give.content, give.hasParenthesis);
            break;

        case Agda.ResponseType.ParseError:
            console.error(`Agda parse error: ${(<Agda.ParseError>response).content}`);
            break;

        case Agda.ResponseType.Goto:
            let res = <Agda.Goto>response;
            core.textBuffer.onGoto(res.filepath, res.position);
            break;

        case Agda.ResponseType.SolveAllAction:
            const solutions = (<Agda.SolveAllAction>response).solutions;
            solutions.forEach((solution) => {
                core.textBuffer.onSolveAllAction(solution.index, solution.expression)
                    .then(core.process.give);
            });
            break;
        case Agda.ResponseType.MakeCaseAction:
            core.textBuffer
                .onMakeCaseAction((<Agda.MakeCaseAction>response).content)
                .then(() => {
                    core.commander.load()
                        .catch((error) => { throw error; });
                });
            break;

        case Agda.ResponseType.MakeCaseActionExtendLam:
            core.textBuffer.onMakeCaseActionExtendLam((<Agda.MakeCaseAction>response).content)
                .then(() => {
                    core.commander.load()
                        .catch((error) => { throw error; });
                });
            break;

        case Agda.ResponseType.HighlightClear:
            core.highlightManager.destroyAll();
            break;

        case Agda.ResponseType.HighlightAddAnnotations:
            let annotations = (<Agda.HighlightAddAnnotations>response).content;
            annotations.forEach((annotation) => {
                let unsolvedmeta = _.includes(annotation.type, "unsolvedmeta");
                let terminationproblem = _.includes(annotation.type, "terminationproblem")
                if (unsolvedmeta || terminationproblem) {
                    core.highlightManager.highlight(annotation);
                }
            });
            break;


        case Agda.ResponseType.HighlightLoadAndDeleteAction:
            // ???
            break;

        case Agda.ResponseType.UnknownAction:
            console.error(`Agda.ResponseType.UnknownAction:`);
            console.error(response);
            break;
        default:
            console.error(`Agda.ResponseType: ${JSON.stringify(response)}`);
    }
}

function handleInfoAction(core: Core, action: Agda.InfoAction)  {
    switch (action.infoActionType) {
        case Agda.InfoActionType.AllGoals:
            if (action.content.length === 0)
                core.view.set("No Goals", []);
            else
                core.view.set("Goals", action.content, View.Type.Judgement);
            break;
        case Agda.InfoActionType.Error:
            core.view.set("Error", action.content, View.Type.Error);
            break;
        case Agda.InfoActionType.TypeChecking:
            core.view.set("Type Checking", action.content);
            break;
        case Agda.InfoActionType.CurrentGoal:
            core.view.set("Current Goal", action.content, View.Type.Value);
            break;
        case Agda.InfoActionType.InferredType:
            core.view.set("Inferred Type", action.content);
            break;
        case Agda.InfoActionType.ModuleContents:
            core.view.set("Module Contents", action.content);
            break;
        case Agda.InfoActionType.Context:
            core.view.set("Context", action.content, View.Type.Judgement);
            break;
        case Agda.InfoActionType.GoalTypeEtc:
            core.view.set("Goal Type and Context", action.content, View.Type.Judgement);
            break;
        case Agda.InfoActionType.NormalForm:
            core.view.set("Normal Form", action.content, View.Type.Value);
            break;
        case Agda.InfoActionType.Intro:
            core.view.set("Intro", ['No introduction forms found']);
            break;
        case Agda.InfoActionType.Auto:
            core.view.set("Auto", ['No solution found']);
            break;
        case Agda.InfoActionType.Constraints:
            core.view.set("Constraints", action.content, View.Type.Judgement);
            break;
        case Agda.InfoActionType.ScopeInfo:
            core.view.set("Scope Info", action.content);
            break;
        default:
            console.error(`unknown info action ${action}`);
    }
}

export {
    handleAgdaResponse
}
