import copyText from "discourse/lib/copy-text";
import Controller from "@ember/controller";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { ajax } from "discourse/lib/ajax";
import ModalFunctionality from "discourse/mixins/modal-functionality";
import Group from "discourse/models/group";

export default Controller.extend(ModalFunctionality, {
  onShow() {
    this.setProperties({
      showAdvanced: false,
      showOnly: false,
      type: "email",
      inviteId: null,
      link: "",
      email: "",
      maxRedemptionsAllowed: 1,
      message: "",
      groupIds: [],
      expiresAt: moment().add(1, "month").format("YYYY-MM-DD HH:mmZ"),
    });

    Group.findAll().then((groups) => {
      this.set("allGroups", groups.filterBy("automatic", false));
    });
  },

  @discourseComputed("type", "email")
  disabled(type, email) {
    if (type === "link") {
    } else if (type === "email") {
      return !email;
    }
  },

  @discourseComputed("type", "inviteId")
  saveLabel(type, inviteId) {
    if (type === "link") {
      if (inviteId) {
        return "user.create_invite.update_invite_link";
      } else {
        return "user.create_invite.create_invite_link";
      }
    } else if (type === "email") {
      return "user.create_invite.send_invite_email";
    }
  },

  @discourseComputed("type")
  isLink(type) {
    return type === "link";
  },

  @discourseComputed("type")
  isEmail(type) {
    return type === "email";
  },

  @action
  copyLink(invite) {
    const $copyRange = $('<p id="copy-range"></p>');
    $copyRange.html(invite.trim());
    $(document.body).append($copyRange);
    copyText(invite, $copyRange[0]);
    $copyRange.remove();
  },

  @action
  saveInvite() {
    ajax("/invites", {
      type: "POST",
      data: {
        email: this.email,
        max_redemptions_allowed: this.maxRedemptionsAllowed,
        group_ids: this.groupIds,
        expires_at: this.expiresAt,
        message: this.message,
      },
    }).then((x) => {
      console.log("result =", x);
    });
  },
});
