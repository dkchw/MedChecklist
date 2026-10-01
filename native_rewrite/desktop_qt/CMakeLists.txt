cmake_minimum_required(VERSION 3.16)
project(MedChecklistDesktop VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 COMPONENTS Core Gui Widgets Sql PrintSupport REQUIRED)

add_executable(MedChecklistDesktop
    src/main.cpp
    src/models/databasemanager.cpp
    src/models/databasemanager.h
    src/models/datamodels.h
    src/canvas/inkingcanvas.cpp
    src/canvas/inkingcanvas.h
    src/ui/mainwindow.cpp
    src/ui/mainwindow.h
    src/ui/newpatientdialog.cpp
    src/ui/newpatientdialog.h
)

target_link_libraries(MedChecklistDesktop PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::Sql
    Qt6::PrintSupport
)

install(TARGETS MedChecklistDesktop DESTINATION bin)
