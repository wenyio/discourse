import { getAbsoluteURL } from "discourse-common/lib/get-url";
import showModal from "discourse/lib/show-modal";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import { equal, reads } from "@ember/object/computed";
import Controller from "@ember/controller";
import { action } from "@ember/object";
import I18n from "I18n";
import { INPUT_DELAY } from "discourse-common/config/environment";
import Invite from "discourse/models/invite";
import bootbox from "bootbox";
import discourseDebounce from "discourse-common/lib/debounce";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Controller.extend({
  user: null,
  model: null,
  filter: null,
  totalInvites: null,
  invitesCount: null,
  canLoadMore: true,
  invitesLoading: false,
  reinvitedAll: false,
  rescindedAll: false,
  searchTerm: null,

  init() {
    this._super(...arguments);
    this.set("searchTerm", "");
  },

  @observes("searchTerm")
  _searchTermChanged() {
    discourseDebounce(
      this,
      function () {
        Invite.findInvitedBy(
          this.user,
          this.filter,
          this.searchTerm
        ).then((invites) => this.set("model", invites));
      },
      INPUT_DELAY
    );
  },

  inviteRedeemed: equal("filter", "redeemed"),
  invitePending: equal("filter", "pending"),

  @discourseComputed("filter")
  inviteLinks(filter) {
    return filter === "links" && this.currentUser.staff;
  },

  @discourseComputed("filter")
  showBulkActionButtons(filter) {
    return (
      filter === "pending" &&
      this.model.invites.length > 4 &&
      this.currentUser.staff
    );
  },

  canInviteToForum: reads("currentUser.can_invite_to_forum"),
  canBulkInvite: reads("currentUser.admin"),

  @discourseComputed("totalInvites", "inviteLinks")
  showSearch(totalInvites, inviteLinks) {
    return totalInvites >= 10 && !inviteLinks;
  },

  @discourseComputed("invitesCount.total", "invitesCount.pending")
  pendingLabel(invitesCountTotal, invitesCountPending) {
    if (invitesCountTotal > 50) {
      return I18n.t("user.invited.pending_tab_with_count", {
        count: invitesCountPending,
      });
    } else {
      return I18n.t("user.invited.pending_tab");
    }
  },

  @discourseComputed("invitesCount.total", "invitesCount.redeemed")
  redeemedLabel(invitesCountTotal, invitesCountRedeemed) {
    if (invitesCountTotal > 50) {
      return I18n.t("user.invited.redeemed_tab_with_count", {
        count: invitesCountRedeemed,
      });
    } else {
      return I18n.t("user.invited.redeemed_tab");
    }
  },

  @action
  showInvite() {
    showModal("create-invite");
  },

  @action
  editInvite(invite) {
    showModal("create-invite").setProperties({
      showAdvanced: true,
      type: invite.email ? "email" : "link",
      inviteId: invite.id,
      link: invite.link,
      email: invite.email,
      maxRedemptionsAllowed: invite.max_redemptions_allowed,
      expiresAt: invite.expires_at,
    });
  },

  @action
  showInviteLink(invite) {
    showModal("create-invite").setProperties({
      showAdvanced: true,
      showOnly: true,
      type: invite.email ? "email" : "link",
      inviteId: invite.id,
      link: invite.link,
      email: invite.email,
      maxRedemptionsAllowed: invite.max_redemptions_allowed,
      expiresAt: invite.expires_at,
    });
  },

  @action
  rescind(invite) {
    invite.rescind();
    return false;
  },

  @action
  rescindAll() {
    bootbox.confirm(I18n.t("user.invited.rescind_all_confirm"), (confirm) => {
      if (confirm) {
        Invite.rescindAll()
          .then(() => {
            this.set("rescindedAll", true);
          })
          .catch(popupAjaxError);
      }
    });
  },

  @action
  reinvite(invite) {
    invite.reinvite();
    return false;
  },

  @action
  reinviteAll() {
    bootbox.confirm(I18n.t("user.invited.reinvite_all_confirm"), (confirm) => {
      if (confirm) {
        Invite.reinviteAll()
          .then(() => this.set("reinvitedAll", true))
          .catch(popupAjaxError);
      }
    });
  },

  @action
  loadMore() {
    const model = this.model;

    if (this.canLoadMore && !this.invitesLoading) {
      this.set("invitesLoading", true);
      Invite.findInvitedBy(
        this.user,
        this.filter,
        this.searchTerm,
        model.invites.length
      ).then((invite_model) => {
        this.set("invitesLoading", false);
        model.invites.pushObjects(invite_model.invites);
        if (
          invite_model.invites.length === 0 ||
          invite_model.invites.length < this.siteSettings.invites_per_page
        ) {
          this.set("canLoadMore", false);
        }
      });
    }
  },
});
