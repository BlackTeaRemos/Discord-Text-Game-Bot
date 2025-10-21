import { StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction, Interaction, Message, StringSelectMenuInteraction } from 'discord.js';
import type { FlowManager } from '../../Common/Flow/Manager.js';
import type { ExecutionContext } from '../../Domain/index.js';
import type { StepContext } from '../../Common/Flow/Types.js';

import { RenderDescription, RenderControls, ResolveBaseInteraction } from './Description/Rendering.js';
import { BuildDescriptionEmbeds } from './Description/BuildDescriptionEmbeds.js';
import { WithTruncationNote } from './Description/WithTruncationNote.js';
import { ApplyEdit } from '../../Flow/Command/Description/ApplyEdit.js';
import { BuildEditControlsContent } from './Description/BuildEditControlsContent.js';
import { BuildEditControlsMenu } from './Description/BuildEditControlsMenu.js';
import { UniqueSelectOptions } from '../../Flow/Command/Description/Helpers.js';
import {
    listVersions,
    getVersion,
    togglePublic,
    listObjectsForType,
    getUserOrganizations,
} from '../../Flow/Command/Description/db.js';
import { GetUserOrganizations } from '../../Flow/Command/Description/GetUserOrganizations.js';
import { GetLatestDescription } from '../../Flow/Object/Description/Latest.js';
import { CreateDescriptionVersion } from '../../Flow/Object/Description/Update.js';

/**
 * Internal state carried across the description creation flow.
 */
export interface State {
    targetType?: `game` | `organization` | `user`;
    targetUid?: string;
    orgUid?: string;
    latestText?: string;
    latestVersion?: number;
    isPublic?: boolean;
    editMode?: `replace` | `append` | `remove`;
    editText?: string;
    editInputs?: string[];
    awaitingFile?: boolean;
    nextAction?: `edit` | `version` | `load_txt` | `toggle_public`;
}

type DescriptionStepContext = StepContext<State>;

/**
 * Start the interactive description creation flow.
 */
export async function StartDescriptionCreateFlow(
    flowManager: FlowManager,
    interaction: ChatInputCommandInteraction,
    executionContext?: ExecutionContext,
) {
    await flowManager
        .builder(interaction.user.id, interaction, {} as State, executionContext)
        .step(`desc_select_type`, `root`)
        .prompt(async (ctx: DescriptionStepContext) => {
            const base = ResolveBaseInteraction(ctx);
            if (base && !ctx.recall(`root`, `interaction`)) {
                ctx.remember(`interaction`, base);
            }
            const select = new StringSelectMenuBuilder()
                .setCustomId(`desc_select_type`)
                .setPlaceholder(`Select object type to describe`)
                .addOptions([
                    { label: `Organization`, value: `organization` },
                    { label: `Game`, value: `game` },
                    { label: `User`, value: `user` },
                ] as any);
            await RenderDescription(ctx, {
                content: `Description preview will appear here after an object is selected.`,
            });
            await RenderControls(ctx, {
                content: `Select object type to begin.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            });
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            if (!i.isStringSelectMenu()) {
                return false;
            }
            ctx.state.targetType = i.values[0] as State[`targetType`];
            await i.deferUpdate();
            return true;
        })
        .next()
        .step(`desc_select_object`)
        .prompt(async (ctx: DescriptionStepContext) => {
            const type = ctx.state.targetType as State[`targetType`];
            if (!type) {
                await RenderDescription(ctx, { content: `Object type was not selected. Cancelling description flow.` });
                await RenderControls(ctx, { content: `Flow cancelled.`, components: [] });
                await ctx.cancel();
                return;
            }
            const records = await listObjectsForType(type);
            const options = UniqueSelectOptions(
                records.map((r: any) => {
                    return { label: r.label.slice(0, 50), value: r.uid };
                }),
            );
            if (options.length === 0) {
                await RenderDescription(ctx, { content: `No ${type} objects found.` });
                await RenderControls(ctx, { content: `Flow cancelled.`, components: [] });
                await ctx.cancel();
                return;
            }
            const select = new StringSelectMenuBuilder()
                .setCustomId(`desc_select_object`)
                .setPlaceholder(`Select ${type}`)
                .addOptions(options as any);
            await RenderDescription(ctx, {
                content: `Type selected: ${type}. Description preview will update after choosing a specific ${type}.`,
            });
            await RenderControls(ctx, {
                content: `Select ${type}`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            });
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            if (!i.isStringSelectMenu()) {
                return false;
            }
            ctx.state.targetUid = i.values[0];
            await i.deferUpdate();
            return true;
        })
        .next()
        .step(`desc_select_org`)
        .prompt(async (ctx: DescriptionStepContext) => {
            const orgs = await getUserOrganizations(interaction.user.id);
            if (orgs.length === 0) {
                await RenderDescription(ctx, {
                    content: `You do not belong to any organization. Description creation cancelled.`,
                });
                await RenderControls(ctx, { content: `Flow cancelled.`, components: [] });
                await ctx.cancel();
                return;
            }
            if (orgs.length === 1) {
                ctx.state.orgUid = orgs[0].uid;
                await ctx.advance();
                return;
            }
            const select = new StringSelectMenuBuilder()
                .setCustomId(`desc_select_org`)
                .setPlaceholder(`Select organization for this description`)
                .addOptions(
                    UniqueSelectOptions(
                        orgs.map(o => {
                            return { label: o.name.slice(0, 50), value: o.uid };
                        }),
                    ) as any,
                );
            await RenderDescription(ctx, {
                content: `Select the organization that owns this description. Preview will appear after loading the latest version.`,
            });
            await RenderControls(ctx, {
                content: `Select organization for this description`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
            });
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            if (!i.isStringSelectMenu()) {
                return false;
            }
            ctx.state.orgUid = i.values[0];
            await i.deferUpdate();
            return true;
        })
        .next()
        .step(`desc_menu`)
        .prompt(async (ctx: DescriptionStepContext) => {
            const { targetType, targetUid, orgUid } = ctx.state as State;
            const latest = await GetLatestDescription(targetType!, targetUid!, orgUid!);
            ctx.state.latestText = latest?.text ?? ``;
            ctx.state.latestVersion = latest?.version ?? 0;
            ctx.state.isPublic = latest?.isPublic ?? false;

            const descriptionPreview = BuildDescriptionEmbeds(
                ctx.state.latestText || ``,
                ctx.state.latestVersion!,
                ctx.state.isPublic!,
            );
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`desc_menu`)
                .setPlaceholder(`Choose an action`)
                .addOptions([
                    { label: `Edit`, value: `edit` },
                    { label: `Select version`, value: `version` },
                    { label: `Load as txt file`, value: `load_txt` },
                    { label: ctx.state.isPublic ? `Make private` : `Generalize (make public)`, value: `toggle_public` },
                    { label: `Exit`, value: `exit` },
                ] as any);
            await RenderDescription(ctx, {
                content: WithTruncationNote(`Description preview`, descriptionPreview.truncated),
                embeds: descriptionPreview.embeds,
            });
            await RenderControls(ctx, {
                content: `Choose what to do next.`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
            });
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            if (!i.isStringSelectMenu()) {
                return false;
            }
            const choice = i.values[0];
            await i.deferUpdate();
            switch (choice) {
                case `edit`:
                    ctx.state.nextAction = `edit`;
                    return true;
                case `version`:
                    ctx.state.nextAction = `version`;
                    return true;
                case `load_txt`:
                    ctx.state.nextAction = `load_txt`;
                    return true;
                case `toggle_public`:
                    ctx.state.nextAction = `toggle_public`;
                    return true;
                case `exit`:
                    await ctx.cancel();
                    return false;
            }
            return false;
        })
        .next()
        .step(`desc_select_version`)
        .prompt(async (ctx: DescriptionStepContext) => {
            const action = ctx.state.nextAction;
            switch (action) {
                case `version`: {
                    const versions = await listVersions(ctx.state.targetType!, ctx.state.targetUid!, ctx.state.orgUid!);
                    const versionOptions = UniqueSelectOptions(
                        versions.map(v => {
                            return { label: `v${v}`, value: String(v) };
                        }),
                    );
                    const select = new StringSelectMenuBuilder()
                        .setCustomId(`desc_select_version`)
                        .setPlaceholder(`Select version`)
                        .addOptions(
                            versionOptions.length
                                ? versionOptions
                                : ([{ label: `No versions`, value: `novers` }] as any),
                        );
                    await RenderControls(ctx, {
                        content: `Select which version to view.`,
                        components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
                    });
                    return;
                }
                case `load_txt`: {
                    await RenderControls(ctx, {
                        content: `Upload a .txt file with the description contents to continue.`,
                        components: [],
                    });
                    ctx.state.awaitingFile = true;
                    ctx.state.editInputs = [];
                    ctx.state.editText = ``;
                    ctx.state.nextAction = `edit`;
                    await ctx.advance();
                    return;
                }
                case `toggle_public`: {
                    const newPublic = !(ctx.state.isPublic ?? false);
                    await togglePublic(ctx.state.targetType!, ctx.state.targetUid!, ctx.state.orgUid!, newPublic);
                    ctx.state.isPublic = newPublic;
                    ctx.state.nextAction = undefined;
                    const visibilityPreview = BuildDescriptionEmbeds(
                        ctx.state.latestText || ``,
                        ctx.state.latestVersion ?? 0,
                        ctx.state.isPublic ?? false,
                    );
                    await RenderDescription(ctx, {
                        content: WithTruncationNote(
                            `Visibility set to ${newPublic ? `public` : `private`}.`,
                            visibilityPreview.truncated,
                        ),
                        embeds: visibilityPreview.embeds,
                    });
                    await RenderControls(ctx, { content: `Visibility updated. Flow will now end.`, components: [] });
                    await ctx.cancel();
                    return;
                }
                default: {
                    ctx.state.nextAction = `edit`;
                    await ctx.advance();
                    return;
                }
            }
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            const action = ctx.state.nextAction;
            if (action === `version`) {
                if (!i.isStringSelectMenu()) {
                    return false;
                }
                const v = Number(i.values[0]);
                await i.deferUpdate();
                if (Number.isNaN(v)) {
                    await RenderControls(ctx, {
                        content: `No stored versions are available for this description.`,
                        components: [],
                    });
                    await ctx.cancel();
                    return false;
                }
                const d = await getVersion(ctx.state.targetType!, ctx.state.targetUid!, ctx.state.orgUid!, v);
                ctx.state.latestText = d?.text ?? ctx.state.latestText;
                ctx.state.latestVersion = d?.version ?? ctx.state.latestVersion;
                ctx.state.nextAction = undefined;
                const versionPreview = BuildDescriptionEmbeds(
                    ctx.state.latestText || ``,
                    ctx.state.latestVersion ?? v,
                    ctx.state.isPublic ?? false,
                );
                await RenderDescription(ctx, {
                    content: WithTruncationNote(
                        `Loaded version v${ctx.state.latestVersion ?? v}.`,
                        versionPreview.truncated,
                    ),
                    embeds: versionPreview.embeds,
                });
                await RenderControls(ctx, { content: `Version loaded. Flow will now end.`, components: [] });
                await ctx.cancel();
                return false;
            }
            return false;
        })
        .next()
        .step(`desc_edit_session`, `edit_session`)
        .prompt(async (ctx: DescriptionStepContext) => {
            ctx.state.editMode = ctx.state.editMode ?? `replace`;
            ctx.state.nextAction = `edit`;
            if (!ctx.state.editInputs || !ctx.state.editInputs.length) {
                if (ctx.state.editText) {
                    ctx.state.editInputs = [ctx.state.editText];
                } else {
                    ctx.state.editInputs = [];
                }
            }
            ctx.state.editText = (ctx.state.editInputs ?? []).join(`\n`);
            const preview = ApplyEdit(ctx.state.latestText || ``, ctx.state.editMode, ctx.state.editText || ``);
            const previewEmbeds = BuildDescriptionEmbeds(
                preview,
                (ctx.state.latestVersion ?? 0) + 1,
                ctx.state.isPublic ?? false,
            );
            await RenderDescription(ctx, {
                content: WithTruncationNote(
                    `Editing in ${ctx.state.editMode} mode. Preview includes pending changes before saving.`,
                    previewEmbeds.truncated,
                ),
                embeds: previewEmbeds.embeds,
            });
            await RenderControls(ctx, {
                content: BuildEditControlsContent(ctx.state),
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(BuildEditControlsMenu(ctx.state)),
                ],
            });
        })
        .onInteraction(async (ctx: DescriptionStepContext, i: Interaction) => {
            if (!i.isStringSelectMenu()) {
                return false;
            }
            await i.deferUpdate();
            const choice = (i as StringSelectMenuInteraction).values[0];
            if (choice === `confirm`) {
                const mode = ctx.state.editMode ?? `replace`;
                const pending = ctx.state.editText ?? ``;
                if (!pending.trim()) {
                    await RenderControls(ctx, {
                        content: `No inputs captured yet. Add content before confirming.`,
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                                BuildEditControlsMenu(ctx.state),
                            ),
                        ],
                    });
                    return false;
                }
                const newText = ApplyEdit(ctx.state.latestText || ``, mode, pending);
                const newVer = await CreateDescriptionVersion(
                    ctx.state.targetType!,
                    ctx.state.targetUid!,
                    ctx.state.orgUid!,
                    newText,
                    interaction.user.id,
                );
                ctx.state.latestText = newVer.text;
                ctx.state.latestVersion = newVer.version;
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
                ctx.state.awaitingFile = false;
                ctx.state.nextAction = undefined;
                const savedPreview = BuildDescriptionEmbeds(
                    ctx.state.latestText || ``,
                    ctx.state.latestVersion ?? newVer.version,
                    ctx.state.isPublic ?? false,
                );
                await RenderDescription(ctx, {
                    content: WithTruncationNote(`Saved version v${newVer.version}.`, savedPreview.truncated),
                    embeds: savedPreview.embeds,
                });
                await RenderControls(ctx, { content: `Saved version v${newVer.version}.`, components: [] });
                await ctx.cancel();
                return false;
            }
            if (choice === `cancel`) {
                ctx.state.nextAction = undefined;
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
                ctx.state.awaitingFile = false;
                const cancelledPreview = BuildDescriptionEmbeds(
                    ctx.state.latestText || ``,
                    ctx.state.latestVersion ?? 0,
                    ctx.state.isPublic ?? false,
                );
                await RenderDescription(ctx, {
                    content: WithTruncationNote(
                        `Description update cancelled. Current description remains unchanged.`,
                        cancelledPreview.truncated,
                    ),
                    embeds: cancelledPreview.embeds,
                });
                await RenderControls(ctx, { content: `Description update cancelled.`, components: [] });
                await ctx.cancel();
                return false;
            }
            if (choice === `reset`) {
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
                ctx.state.awaitingFile = false;
            } else if (choice === `mode_replace`) {
                ctx.state.editMode = `replace`;
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
            } else if (choice === `mode_append`) {
                ctx.state.editMode = `append`;
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
            } else if (choice === `mode_remove`) {
                ctx.state.editMode = `remove`;
                ctx.state.editInputs = [];
                ctx.state.editText = ``;
            }
            const preview = ApplyEdit(
                ctx.state.latestText || ``,
                ctx.state.editMode ?? `replace`,
                ctx.state.editText || ``,
            );
            const updatedPreview = BuildDescriptionEmbeds(
                preview,
                (ctx.state.latestVersion ?? 0) + 1,
                ctx.state.isPublic ?? false,
            );
            await RenderDescription(ctx, {
                content: WithTruncationNote(
                    `Editing in ${ctx.state.editMode ?? `replace`} mode. Preview includes pending changes before saving.`,
                    updatedPreview.truncated,
                ),
                embeds: updatedPreview.embeds,
            });
            await RenderControls(ctx, {
                content: BuildEditControlsContent(ctx.state),
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(BuildEditControlsMenu(ctx.state)),
                ],
            });
            return false;
        })
        .onMessage(async (ctx: DescriptionStepContext, msg: Message) => {
            let inputText = ``;
            const attachment = msg.attachments?.first?.();
            const attachmentIsTxt = Boolean(attachment && String(attachment.name).toLowerCase().endsWith(`.txt`));
            if (ctx.state.awaitingFile ?? false) {
                if (!attachmentIsTxt) {
                    await msg.reply(`Please upload a .txt file to continue.`);
                    return false;
                }
                const response = await fetch(attachment!.url);
                inputText = await response.text();
            } else if (attachmentIsTxt) {
                const response = await fetch(attachment!.url);
                inputText = await response.text();
            } else {
                inputText = msg.content ?? ``;
            }
            if (!inputText.trim()) {
                await msg.reply(`Please provide text content to apply.`);
                return false;
            }
            ctx.state.awaitingFile = false;
            const mode = ctx.state.editMode ?? `replace`;
            ctx.state.nextAction = `edit`;
            if (!ctx.state.editInputs) {
                ctx.state.editInputs = [];
            }
            if (mode === `append`) {
                ctx.state.editInputs.push(inputText);
            } else {
                ctx.state.editInputs = [inputText];
            }
            ctx.state.editText = ctx.state.editInputs.join(`\n`);
            const preview = ApplyEdit(ctx.state.latestText || ``, mode, ctx.state.editText || ``);
            const messagePreview = BuildDescriptionEmbeds(
                preview,
                (ctx.state.latestVersion ?? 0) + 1,
                ctx.state.isPublic ?? false,
            );
            await RenderDescription(ctx, {
                content: WithTruncationNote(
                    `Editing in ${mode} mode. Preview includes pending changes before saving.`,
                    messagePreview.truncated,
                ),
                embeds: messagePreview.embeds,
            });
            await RenderControls(ctx, {
                content: BuildEditControlsContent(ctx.state),
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(BuildEditControlsMenu(ctx.state)),
                ],
            });
            return false;
        })
        .next()
        .start();
}
