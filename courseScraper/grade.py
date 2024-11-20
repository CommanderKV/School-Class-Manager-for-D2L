"""
# Description:
    This module contains the Grade class which is used to store the grade of an item.

## Classes:
    - Grade:
        This class will contain the information of a grade.
"""
import time

from bs4 import BeautifulSoup
from customPrint import print # pylint: disable=redefined-builtin,import-error

class Grade:
    """
    # Description:
        This class will contain the information of a grade.
    """
    def __init__(
            self,
            name: str | None = None,
            pointsAchived: float | None = None,
            pointsMax: float | None = None,
            weightAchieved: float | None = None,
            weightMax: float | None = None,
            grade: float | None = None,
            uid: int | None = None
        ):
        """
        # Description:
            The constructor for the Grade class.
        """
        self.name: str | None = name
        self.pointsAchived: float | None = pointsAchived
        self.pointsMax: float | None = pointsMax
        self.weightAchieved: float | None = weightAchieved
        self.weightMax: float | None = weightMax
        self.grade: float | None = grade
        self.uid: int | None = uid

    def fill(self, row: BeautifulSoup, headerRow: dict[str, int]) -> None:
        """
        # Description:
            This function fills the grade object with the data from the row.

        ## Args:
            - row (BeautifulSoup): 
                The row containing the grade data.
            - headerRow (dict[str, int]):
                The header row of the grade table.

        ## Returns:
            None
        """
        print("\t[Notice] Filling grade data...")
        print(row)
        print(headerRow)

        # Find and get the "Assignment" name
        self._getName(row)

        # Find and get the points value if any
        self._getPoints(row, headerRow)

        # Find and get the weight value if any
        self._getWeight(row, headerRow)

        # Find and get the Grade value if any
        if not self._findGrade(row, headerRow) and self.pointsAchived and self.pointsMax != 0:
            self.grade = ((self.pointsAchived / self.pointsMax) * 100) if self.pointsMax != 0 else 0

        # Make a Unique ID for the grade
        self.makeUID()


    def _getName(self, row: BeautifulSoup) -> bool:
        """
        # Description:
            This function gets the name of the grade item.

        ## Args:
            - row (BeautifulSoup): 
                The row containing the grade data.

        ## Returns:
            bool: 
                If the name is found or not.
        """
        # Get the name from the row
        nameLabel = row.select("tr label")

        # Check if the name is found if so set it
        if nameLabel:
            nameLabel = nameLabel[0]
            self.name = nameLabel.text
            print("\t\t[Success] Found grade name!")
            return True

        # If the name is not found display a warning
        print("\t\t[Warning] Could not find grade name!")
        return False

    def _getPoints(self, row: BeautifulSoup, headerRow: dict[str, int]) -> bool:
        """
        # Description:
            This function gets the points of the grade item.

        ## Args:
            - row (BeautifulSoup): 
                The row containing the grade data.
            - headerRow (dict[str, int]): 
                The header row of the grade table.

        ## Returns:
            bool: 
                If the points are found or not.
        """
        # Check if "Points" is in the header row
        if "points" in [col for col in headerRow.keys()]:
            # Get the poisition of the points column
            pointsCol = headerRow["points"]

            print(f"\n\n{row.select('label')}\n\n")

            # Get the data from the points column
            points = row.select("label")

            # Check if the points are found if so set it
            if points:
                points: str = points[pointsCol]
                print(f"\n\n{points}, {pointsCol}, {headerRow}\n\n")
                # Check if the points are graded or not
                if "-" in points.text:
                    print("\t\t[Notice] Grade Item has yet to be graded!")
                    return True

                # Get the points value
                points: list[str] = points.text.split(" / ")
                self.pointsAchived = float(points[0])
                self.pointsMax = float(points[1])
                print("\t\t[Success] Found grade points!")
                return True

            # If the points are not found display a warning
            print("\t\t[Warning] Could not find grade points!")
            return False

        # If the points column is not found display a warning
        print("\t\t[Warning] Could not find grade points column!")
        return False

    def _getWeight(self, row: BeautifulSoup, headerRow: dict[str, int]) -> bool:
        """
        # Description:
            This function gets the weight of the grade item.

        ## Args:
            - row (BeautifulSoup): 
                The row containing the grade data.
            - headerRow (dict[str, int]): 
                The header row of the grade table.

        ## Returns:
            bool: 
                If the weight is found or not.
        """
        # Check if "Weight" is in the header row
        keys = [col for col in headerRow.keys()]
        value: str | None = None
        if "weight" in keys:
            value = "weight"
        elif "weight achieved" in keys:
            value = "weight achieved"

        if value is not None:
            # Get the poisition of the weight column
            weightCol: str = headerRow[value]

            # Get the data from the weight column
            weight = row.select("label")

            # Check if the weight is found if so set it
            if weight:
                weight = weight[weightCol]
                # Check if the weight is weighted or not
                if "-" in weight.text:
                    print("\t\t[Notice] Grade is not weighted!")
                    return True

                # Get the weight value
                weight: list[str] = weight.text.split(" / ")
                self.weightAchieved = float(weight[0])
                self.weightMax = float(weight[1])
                print("\t\t[Success] Found grade weight!")
                return True

            # If the weight is not found display a warning
            print("\t\t[Warning] Could not find grade weight!")
            return False

        # If the weight column is not found display a warning
        print("\t\t[Warning] Could not find grade weight column!")
        return False

    def _findGrade(self, row: BeautifulSoup, headerRow: dict[str, int]) -> bool:
        """
        # Description:
            This function finds the grade of the grade item

        ## Args:
            - row (BeautifulSoup): 
                The row containing the grade data.
            - headerRow (dict[str, int]): 
                The header row of the grade table.

        ## Returns:
            Bool: If the grade is found or not.
        """
        # Check if "Grade" is in the header row
        if "grade" in [col.lower() for col in headerRow.keys()]:
            # Get the poisition of the grade column
            gradeCol = headerRow["grade"]

            # Get the data from the grade column
            grade = row.select("label")

            # Check if the grade is found if so set it
            if grade:
                grade: str = grade[gradeCol]
                # Check if the grade is graded or not
                if "-" in grade.text:
                    print("\t\t[Notice] Grade Item has yet to be graded!")
                    return False

                # Get the grade value
                self.grade = float(grade.text.split("%")[0])
                print("\t\t[Success] Found grade!")
                return False

            # If the grade is not found display a warning
            print("\t\t[Warning] Could not find grade!")
            return False

    def makeUID(self) -> None:
        """
        # Description:
            This function makes a unique ID for the grade.
        """
        # Make the name into a unique ID
        name = self.name.replace(" ", "_").lower()

        # Convert the name into numbers
        uid = sum([ord(char) for char in name])

        # Add the current time to the unique ID
        uid += time.time()

        # Make the unique ID
        self.uid = round(uid)

    def toDict(self) -> dict[str, str | float]:
        """
        # Description:
            This function returns the dictionary of the grade object.

        ## Returns:
            dict[str, str | float | None]: 
                The dictionary of the grade object.
        """
        return {
            "uid": self.uid,
            "name": self.name,
            "pointsAchived": self.pointsAchived,
            "pointsMax": self.pointsMax,
            "weightAchieved": self.weightAchieved,
            "weightMax": self.weightMax,
            "grade": self.grade
        }

    def __eq__(self, other: object) -> bool:
        """
        # Description:
            This function compares the grade object with another grade object.

        ## Args:
            - other (object): 
                The other object to compare with.

        ## Returns:
            bool | NotImplemented: 
                If the objects are the same or not.
        """
        from assignment import Assignment # pylint: disable=import-outside-toplevel,import-error

        # Check if it is an assignment
        if isinstance(other, Assignment):
            if self.name.replace(" ", "") == other.name.replace(" ", ""):
                if self.grade == other.grade or other.grade is None:
                    return True

        # Check if it is a grade
        if not isinstance(other, Grade):
            return NotImplemented

        # Compare the grade objects without the UID
        if self.name == other.name:
            if self.weightAchieved == other.weightAchieved:
                if self.weightMax == other.weightMax:
                    if self.pointsAchived == other.pointsAchived:
                        if self.pointsMax == other.pointsMax:
                            if self.grade == other.grade:
                                return True

        # Return NotImplemented if the objects are not the same
        return NotImplemented
