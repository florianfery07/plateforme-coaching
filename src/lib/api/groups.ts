// @ts-nocheck

import { supabase } from "@/lib/supabase";

export async function loadAthleteGroups() {
  const { data: groups, error: groupError } = await supabase
    .from("athlete_groups")
    .select("*")
    .order("created_at", { ascending: true });

  if (groupError) {
    throw groupError;
  }

  const { data: members, error: memberError } = await supabase
    .from("athlete_group_members")
    .select("*");

  if (memberError) {
    throw memberError;
  }

  return {
    groups: groups || [],
    members: members || [],
  };
}

export async function createAthleteGroup(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return null;
  }

  const { data, error } = await supabase
    .from("athlete_groups")
    .insert({ name: cleanName })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAthleteGroupName(groupId, name) {
  const cleanName = String(name || "").trim();

  if (!groupId || !cleanName) {
    return null;
  }

  const { data, error } = await supabase
    .from("athlete_groups")
    .update({ name: cleanName })
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function removeAthleteGroup(groupId) {
  if (!groupId) return false;

  const { error } = await supabase
    .from("athlete_groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    throw error;
  }

  return true;
}

export async function setAthleteGroupMember(groupId, athleteId, checked) {
  if (!groupId || !athleteId) return false;

  if (checked) {
    const { error } = await supabase
      .from("athlete_group_members")
      .upsert(
        {
          group_id: groupId,
          athlete_id: athleteId,
        },
        {
          onConflict: "group_id,athlete_id",
        }
      );

    if (error) {
      throw error;
    }

    return true;
  }

  const { error } = await supabase
    .from("athlete_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("athlete_id", athleteId);

  if (error) {
    throw error;
  }

  return true;
}
