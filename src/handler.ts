import * as Promise from 'bluebird';
import * as _ from 'lodash';
import * as fs from 'fs';
import { Agda, View } from './type';
import * as Req from './request';
import Core from './core';
import { parseSExpression, parseAnnotation, parseJudgements, parseError } from './parser';

const handleResponses = (core: Core) => (responses: Agda.Response[]): Promise<void> => {
    return Promise.each(prioritiseResponses(responses), handleResponse(core))
        .then(() => {});
}

function prioritiseResponses(responses: Agda.Response[]): Agda.Response[] {
    //  Priority of responses:
    //      agda2-maybe-goto: 3
    //      agda2-make-case-response: 2
    //      agda2-make-case-response-extendlam: 2
    //      agda2-solveAll-response: 2
    //      agda2-goals-response: 1
    //      OTHERS: 0
    return _.sortBy(responses, res => {
        switch (res.kind) {
            case 'Goto':
                return 3;
            case 'MakeCaseAction':
            case 'MakeCaseActionExtendLam':
            case 'SolveAllAction':
                return 2;
            case 'GoalsAction':
                return 1;
            default:
                return 0;
        }
    });
}

const handleResponse = (core: Core) => (response: Agda.Response): Promise<void> => {
    // console.log(response.kind)
    switch (response.kind) {
        case 'InfoAction':
            handleInfoAction(core, response);
            return Promise.resolve();

        case 'StatusAction':
            if (response.content.length !== 0) {
                core.view.set('Status', response.content);
            }
            return Promise.resolve();

        case 'GoalsAction':
            return core.textBuffer.onGoalsAction(response.content);

        case 'GiveAction':
            return core.textBuffer.onGiveAction(response.index, response.content, response.hasParenthesis);

        case 'Goto':
            return core.textBuffer.onGoto(response.filepath, response.position);

        case 'SolveAllAction':
            return Promise.each(response.solutions, (solution) => {
                return core.textBuffer.onSolveAllAction(solution.index, solution.expression)
                    .then(goal => core.connector
                        .getConnection()
                        .then(Req.give(goal))
                        .then(handleResponses(core))
                    )
            }).then(() => {});

        case 'MakeCaseAction':
            return core.textBuffer
                .onMakeCaseAction(response.content)
                .then(() => core.connector
                    .getConnection()
                    .then(Req.load)
                    .then(handleResponses(core))
                )
                .then(() => {});

        case 'MakeCaseActionExtendLam':
            return core.textBuffer.onMakeCaseActionExtendLam(response.content)
                .then(() => core.connector
                    .getConnection()
                    .then(Req.load)
                    .then(handleResponses(core))
                )
                .then(() => {});

        case 'HighlightClear':
            return core.highlightManager.destroyAll();

        case 'HighlightAddAnnotations':
            const annotations = response.content;
            return Promise.each(annotations, (annotation) => {
                let unsolvedmeta = _.includes(annotation.type, 'unsolvedmeta');
                let terminationproblem = _.includes(annotation.type, 'terminationproblem')
                if (unsolvedmeta || terminationproblem) {
                    core.highlightManager.highlight(annotation);
                }
            }).then(() => {});

        case 'HighlightLoadAndDeleteAction':
            return Promise.promisify(fs.readFile)(response.content)
                .then(data => {
                    const annotations = parseSExpression(data.toString()).map(parseAnnotation);
                    annotations.forEach((annotation) => {
                        let unsolvedmeta = _.includes(annotation.type, 'unsolvedmeta');
                        let terminationproblem = _.includes(annotation.type, 'terminationproblem')
                        if (unsolvedmeta || terminationproblem) {
                            core.highlightManager.highlight(annotation);
                        }
                    });
                })

        default:
            console.error(`Agda.ResponseType: ${JSON.stringify(response)}`);
            return Promise.resolve();
    }
}

function handleInfoAction(core: Core, response: Agda.InfoAction)  {
    switch (response.infoActionKind) {
        case 'AllGoals':
            if (response.content.length === 0) {
                core.view.set('All Done', [], View.Style.Success);

            } else {
                core.view.setJudgements('Goals', parseJudgements(response.content));
            }
            break;
        case 'Error':
            // core.commander.pendingQueue.reject();

            const error = parseError(response.content.join('\n'));
            core.view.setError(error);

            break;
        case 'TypeChecking':
            core.view.set('Type Checking', response.content);
            break;
        case 'CurrentGoal':
            core.view.set('Current Goal', response.content, View.Style.Info);
            break;
        case 'InferredType':
            core.view.set('Inferred Type', response.content, View.Style.Info);
            break;
        case 'ModuleContents':
            core.view.set('Module Contents', response.content, View.Style.Info);
            break;
        case 'Context':
            core.view.setJudgements('Context', parseJudgements(response.content));
            break;
        case 'GoalTypeEtc':
            core.view.setJudgements('Goal Type and Context', parseJudgements(response.content));
            break;
        case 'NormalForm':
            core.view.set('Normal Form', response.content, View.Style.Info);
            break;
        case 'Intro':
            core.view.set('Intro', ['No introduction forms found']);
            break;
        case 'Auto':
            core.view.set('Auto', ['No solution found'], View.Style.Info);
            break;
        case 'Constraints':
            core.view.set('Constraints', response.content, View.Style.Info);
            break;
        case 'ScopeInfo':
            core.view.set('Scope Info', response.content, View.Style.Info);
            break;
        case 'Unknown':
            core.view.set(_.head(response.content) || 'UNKNOWN INFO ACTION FROM AGDA', _.tail(response.content), View.Style.Warning);
            break;
        default:
            console.error(`unknown info response:`);
            console.error(response);
    }
}

export {
    handleResponses
}
