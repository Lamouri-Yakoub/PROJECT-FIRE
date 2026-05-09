from sys import _current_exceptions
import joblib
import pandas as pd
from utils import store

def add_fire(fire):

    forest = fire["FORET"]

    ctx = store.get_forest_context()
    # if forest already exists
    if forest in ctx.index:

        current_row = ctx.loc[forest].copy()

    else:
        # create new forest entry
        current_row = {
            "FORET": forest,
            "DAIRA": fire.get("DAIRA"),
            "COMMUNE": fire.get("COMMUNE"),
            "FORET_FIRE_COUNT": 0,
            "DAIRA_FIRE_COUNT": 0,
            "COMMUNE_FIRE_COUNT": 0,

            "DAIRA_GROUP": "WEAK",
            "FORET_GROUP": "WEAK",
            "COMMUNE_GROUP": "WEAK",

            "TOT_FORET": 0,
            "TOT_MAQUIS": 0,
            "TOT_BROUSSAILLES": 0,
            "SURF_TOTAL": 0,
        }

        ctx.loc[forest] = current_row

        current_row = ctx.loc[forest].copy()

    # update forest statistics
    updated_row = add_fire_forest(current_row, fire)

    ctx.loc[forest] = updated_row

    store.save_forest_context(ctx)



def add_fire_forest(current_row, fire):

    # 1) Update raw counters
    current_row["FORET_FIRE_COUNT"] += 1
    current_row["DAIRA_FIRE_COUNT"] += 1
    current_row["COMMUNE_FIRE_COUNT"] += 1

    # 2) Update agreations stats
    current_row["DAIRA_GROUP"] = getDairaGroup(current_row["DAIRA_FIRE_COUNT"])
    current_row["COMMUNE_GROUP"] = getCommuneGroup(current_row["COMMUNE_FIRE_COUNT"])
    current_row["FORET_GROUP"] = getForetGroup(current_row["FORET_FIRE_COUNT"])

    # 3) Update surface stats
    current_row["TOT_FORET"] = getTot(current_row, "TOT_FORET", fire.get("TOT_FORET"))
    current_row["TOT_MAQUIS"] = getTot(current_row, "TOT_MAQUIS", fire.get("TOT_MAQUIS"))
    current_row["TOT_BROUSSAILLES"] = getTot(current_row, "TOT_BROUSSAILLES", fire.get("TOT_BROUSSAILLES"))
    current_row["SURF_TOTAL"] = getTot(current_row, "SURF_TOTAL", fire.get("SURF_TOTAL"))

    return current_row


def getDairaGroup (count):
    if count >= 80:
        return "HIGH"
    elif count >= 20:
        return "MEDIUM"
    else:
        return "WEAK"

def getCommuneGroup (count):
    if count >= 20:
        return "HIGH"
    elif count >= 4:
        return "MEDIUM"
    else:
        return "WEAK"

def getForetGroup (count):
    if count >= 6:
        return "HIGH"
    elif count >= 3:
        return "MEDIUM"
    else:
        return "WEAK"

def getTot (current_row, column, fireValue):
    # recalculate the avrage ((old coulmn +1) / total fires in that forest)
    value = (current_row[column] + fireValue) / current_row["FORET_FIRE_COUNT"]
    return value